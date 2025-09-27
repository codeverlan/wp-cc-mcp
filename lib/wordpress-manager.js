/**
 * WordPress Manager - Handles WordPress theme/plugin installation and configuration
 * Refactored to use new utilities for improved reliability and logging
 * @version 2.0.0
 */

import path from 'path';
import fs from 'fs-extra';
import fetch from 'node-fetch';
import { logger } from './logger.js';
import { config } from './config-manager.js';
import { commandExecutor } from './command-executor.js';
import { 
  createSuccessResponse, 
  createErrorResponse 
} from './mcp-response.js';

export class WordPressManager {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    logger.debug('WordPressManager initialized');
  }

  async getProjectPath(projectName) {
    return config.getProjectPath(projectName);
  }

  async installTheme(projectName, source, activate = false) {
    try {
      await this.initialize();
      const projectPath = await this.getProjectPath(projectName);
      
      if (!await fs.pathExists(projectPath)) {
        return createErrorResponse(`Project '${projectName}' does not exist`);
      }

      logger.info('Installing WordPress theme', { projectName, source, activate });

      const themesDir = path.join(projectPath, 'wp-content', 'themes');
      await fs.ensureDir(themesDir);
      let themeName;

      if (source.startsWith('http')) {
        // Download theme from URL
        themeName = path.basename(source, '.zip');
        const themePath = path.join('/tmp', `${themeName}-${Date.now()}.zip`);
        
        const response = await fetch(source, { timeout: 30000 });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const buffer = await response.buffer();
        await fs.writeFile(themePath, buffer);
        
        // Extract theme
        await commandExecutor.execute(['unzip', '-o', themePath, '-d', themesDir], {
          timeout: 60000,
          description: `Extract theme ${themeName}`
        });
        await fs.remove(themePath);
      } else if (await fs.pathExists(source)) {
        // Copy local theme
        themeName = path.basename(source);
        await fs.copy(source, path.join(themesDir, themeName));
        logger.debug('Local theme copied', { themeName, source });
      } else {
        // Install from WordPress repository via WP-CLI
        themeName = source;
        const result = await commandExecutor.execute([
          'docker', 'exec', `wp-${projectName}-app`,
          'wp', 'theme', 'install', source, '--allow-root'
        ], {
          timeout: 120000,
          description: `Install theme ${source} via WP-CLI`
        });
        
        if (!result.success) {
          return createErrorResponse(
            `Failed to install theme '${source}': ${result.stderr}`,
            { projectName, source }
          );
        }
      }

      // Activate theme if requested
      if (activate) {
        const activateResult = await commandExecutor.execute([
          'docker', 'exec', `wp-${projectName}-app`,
          'wp', 'theme', 'activate', themeName, '--allow-root'
        ], {
          timeout: 30000,
          description: `Activate theme ${themeName}`
        });
        
        if (!activateResult.success) {
          logger.warn('Theme installed but activation failed', {
            projectName, themeName, error: activateResult.stderr
          });
          return createSuccessResponse(
            `Theme '${themeName}' installed successfully but activation failed: ${activateResult.stderr}`,
            { themeName, installed: true, activated: false }
          );
        }
      }

      logger.info('Theme installed successfully', {
        projectName, themeName, activated: activate
      });

      return createSuccessResponse(
        `Theme '${themeName}' installed successfully${activate ? ' and activated' : ''}`,
        { themeName, installed: true, activated: activate }
      );
      
    } catch (error) {
      logger.logError(error, {
        operation: 'install-theme',
        projectName, source, activate
      });
      return createErrorResponse(
        `Failed to install theme: ${error.message}`,
        { projectName, source, activate }
      );
    }
  }

  async installPlugin(projectName, source, activate = false) {
    const projectPath = await this.getProjectPath(projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project ${projectName} does not exist`);
    }

    const pluginsDir = path.join(projectPath, 'wp-content', 'plugins');
    await fs.ensureDir(pluginsDir);

    let pluginName;

    try {
      if (source.startsWith('http')) {
        // Download plugin from URL
        pluginName = path.basename(source, '.zip');
        const pluginPath = path.join('/tmp', `${pluginName}.zip`);
        
        const response = await fetch(source);
        const buffer = await response.buffer();
        await fs.writeFile(pluginPath, buffer);
        
        // Extract plugin
        await execa('unzip', ['-o', pluginPath, '-d', pluginsDir]);
        await fs.remove(pluginPath);
      } else if (await fs.pathExists(source)) {
        // Copy local plugin
        pluginName = path.basename(source);
        await fs.copy(source, path.join(pluginsDir, pluginName));
      } else {
        // Install from WordPress repository
        pluginName = source;
        await execa('docker', [
          'exec',
          `wp-${projectName}-app`,
          'wp',
          'plugin',
          'install',
          source,
          '--allow-root',
        ]);
      }

      // Activate plugin if requested
      if (activate) {
        await execa('docker', [
          'exec',
          `wp-${projectName}-app`,
          'wp',
          'plugin',
          'activate',
          pluginName,
          '--allow-root',
        ]);
      }

      return {
        content: [
          {
            type: 'text',
            text: `Plugin ${pluginName} installed successfully${activate ? ' and activated' : ''}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to install plugin: ${error.message}`);
    }
  }

  async configure(projectName, settings) {
    const projectPath = await this.getProjectPath(projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project ${projectName} does not exist`);
    }

    const configPath = path.join(projectPath, 'wp-config.php');
    let config = await fs.readFile(configPath, 'utf-8');

    try {
      // Update configuration settings
      for (const [key, value] of Object.entries(settings)) {
        const definePattern = new RegExp(`define\\s*\\(\\s*['"]${key}['"]\\s*,\\s*[^)]+\\)`, 'g');
        
        if (config.match(definePattern)) {
          // Update existing define
          const newDefine = `define('${key}', ${this.formatConfigValue(value)})`;
          config = config.replace(definePattern, newDefine);
        } else {
          // Add new define before wp-settings.php
          const settingsPattern = /require_once\s+ABSPATH\s*\.\s*['"]wp-settings\.php['"]/;
          const newDefine = `define('${key}', ${this.formatConfigValue(value)});\n\n`;
          config = config.replace(settingsPattern, newDefine + '$&');
        }
      }

      await fs.writeFile(configPath, config);

      return {
        content: [
          {
            type: 'text',
            text: `Configuration updated for ${projectName}:\n` +
                  Object.entries(settings).map(([k, v]) => `  ${k}: ${v}`).join('\n'),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to update configuration: ${error.message}`);
    }
  }

  async createTheme(projectName, themeName, description = '') {
    const projectPath = await this.getProjectPath(projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project ${projectName} does not exist`);
    }

    const themeDir = path.join(projectPath, 'wp-content', 'themes', themeName);
    await fs.ensureDir(themeDir);

    // Create style.css
    const styleCss = `/*
Theme Name: ${themeName}
Theme URI: http://localhost
Author: WordPress MCP
Author URI: http://localhost
Description: ${description || 'Custom WordPress theme'}
Version: 1.0.0
License: GPL v2 or later
Text Domain: ${themeName}
*/

/* Theme styles */
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
  line-height: 1.6;
  color: #333;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}`;

    await fs.writeFile(path.join(themeDir, 'style.css'), styleCss);

    // Create index.php
    const indexPhp = `<?php get_header(); ?>

<div class="container">
  <main>
    <?php if (have_posts()) : ?>
      <?php while (have_posts()) : the_post(); ?>
        <article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
          <h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
          <div class="entry-content">
            <?php the_excerpt(); ?>
          </div>
        </article>
      <?php endwhile; ?>
    <?php else : ?>
      <p>No posts found.</p>
    <?php endif; ?>
  </main>
</div>

<?php get_footer(); ?>`;

    await fs.writeFile(path.join(themeDir, 'index.php'), indexPhp);

    // Create header.php
    const headerPhp = `<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
  <meta charset="<?php bloginfo('charset'); ?>">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
  <header>
    <div class="container">
      <h1><a href="<?php echo home_url(); ?>"><?php bloginfo('name'); ?></a></h1>
      <p><?php bloginfo('description'); ?></p>
    </div>
  </header>`;

    await fs.writeFile(path.join(themeDir, 'header.php'), headerPhp);

    // Create footer.php
    const footerPhp = `  <footer>
    <div class="container">
      <p>&copy; <?php echo date('Y'); ?> <?php bloginfo('name'); ?></p>
    </div>
  </footer>
  <?php wp_footer(); ?>
</body>
</html>`;

    await fs.writeFile(path.join(themeDir, 'footer.php'), footerPhp);

    // Create functions.php
    const functionsPhp = `<?php
// Theme setup
function ${themeName.replace(/-/g, '_')}_setup() {
    // Add theme support
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', array('search-form', 'comment-form', 'comment-list', 'gallery', 'caption'));
    
    // Register navigation menu
    register_nav_menus(array(
        'primary' => 'Primary Menu',
    ));
}
add_action('after_setup_theme', '${themeName.replace(/-/g, '_')}_setup');

// Enqueue styles
function ${themeName.replace(/-/g, '_')}_styles() {
    wp_enqueue_style('${themeName}-style', get_stylesheet_uri(), array(), '1.0.0');
}
add_action('wp_enqueue_scripts', '${themeName.replace(/-/g, '_')}_styles');`;

    await fs.writeFile(path.join(themeDir, 'functions.php'), functionsPhp);

    return {
      content: [
        {
          type: 'text',
          text: `Created theme ${themeName} in ${projectName}`,
        },
      ],
    };
  }

  formatConfigValue(value) {
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    } else if (typeof value === 'number') {
      return value;
    } else {
      return `'${value}'`;
    }
  }
}