/**
 * Project Manager - Manages WordPress project lifecycle and operations
 * 
 * Refactored to use:
 * - ConfigManager for centralized configuration
 * - Logger for structured logging
 * - CommandExecutor for safe command execution
 * - SQLite DatabaseManager for data persistence
 * - MCP response utilities for consistent output
 * 
 * @author WP-CC-MCP
 * @version 2.0.0
 */

import path from 'path';
import fs from 'fs-extra';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';
import { config } from './config-manager.js';
import { commandExecutor } from './command-executor.js';
import { sqliteDb } from './sqlite-database-manager.js';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createTableResponse,
  createJsonResponse 
} from './mcp-response.js';
import { DockerManager } from './docker-manager.js';
import { GitManager } from './git-manager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Enhanced project manager with improved error handling, logging, and database operations
 */
export class ProjectManager {
  constructor() {
    this.dockerManager = new DockerManager();
    this.gitManager = new GitManager();
    this.wordPressVersion = '6.8.1';
    this.isInitialized = false;
  }

  /**
   * Initialize the project manager
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Ensure SQLite database is initialized
      if (!sqliteDb.isInitialized) {
        await sqliteDb.initialize();
      }

      // Ensure projects directory exists
      await fs.ensureDir(config.getProjectsDir());

      this.isInitialized = true;
      logger.info('ProjectManager initialized successfully', {
        projectsDir: config.getProjectsDir(),
        wordPressVersion: this.wordPressVersion
      });

    } catch (error) {
      logger.logError(error, {
        operation: 'project-manager-init'
      });
      throw new Error(`Failed to initialize ProjectManager: ${error.message}`);
    }
  }

  /**
   * Create a new WordPress project
   * @param {string} name - Project name (lowercase, alphanumeric, hyphens only)
   * @param {number} port - Local development port
   * @param {string} gitRemote - Optional Git remote URL
   * @returns {Promise<Object>} Creation result
   */
  async createProject(name, port, gitRemote = null) {
    await this.initialize();

    // Validate inputs
    const validation = this.validateProjectInputs(name, port);
    if (!validation.valid) {
      return createErrorResponse(validation.error);
    }

    const projectPath = path.join(config.getProjectsDir(), name);
    const operationId = crypto.randomUUID();

    try {
      logger.info('Creating new WordPress project', {
        operationId,
        name,
        port,
        gitRemote,
        projectPath
      });

      // Check if project already exists in database
      const existingProject = sqliteDb.queryOne(
        'SELECT * FROM projects WHERE name = ?', 
        [name]
      );
      if (existingProject) {
        return createErrorResponse(`Project '${name}' already exists`);
      }

      // Check if port is already in use
      const portInUse = sqliteDb.queryOne(
        'SELECT * FROM projects WHERE port = ?', 
        [port]
      );
      if (portInUse) {
        return createErrorResponse(
          `Port ${port} is already in use by project '${portInUse.name}'`
        );
      }

      // Execute project creation in transaction
      const result = await sqliteDb.transaction(async () => {
        // Create project directory
        await fs.ensureDir(projectPath);
        logger.debug('Created project directory', { projectPath });

        // Download and extract WordPress
        await this.downloadWordPress(name, projectPath);
        logger.debug('WordPress downloaded and extracted');

        // Create project structure
        await this.createProjectStructure(projectPath, name, port);
        logger.debug('Project structure created');

        // Initialize Git repository
        if (gitRemote) {
          await this.gitManager.initRepository(projectPath, gitRemote);
          logger.debug('Git repository initialized with remote', { gitRemote });
        } else {
          await this.gitManager.initRepository(projectPath);
          logger.debug('Git repository initialized');
        }

        // Insert project into database
        const insertInfo = sqliteDb.execute(`
          INSERT INTO projects (
            name, path, port, git_remote, active, 
            project_type, status, configuration
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          name, 
          projectPath, 
          port, 
          gitRemote, 
          0, 
          'wordpress', 
          'created',
          JSON.stringify({ 
            wordPressVersion: this.wordPressVersion,
            createdBy: 'wp-cc-mcp',
            operationId 
          })
        ]);

        const projectId = insertInfo.lastInsertRowid;
        logger.debug('Project inserted into database', { projectId });

        // Start Docker containers
        await this.dockerManager.startProject(name);
        logger.debug('Docker containers started');

        // Update project status to running
        sqliteDb.execute(
          'UPDATE projects SET status = ? WHERE id = ?',
          ['running', projectId]
        );

        // Wait for WordPress to be ready
        await this.waitForWordPress(port);
        logger.debug('WordPress is ready and accessible');

        // Make initial commit
        await this.gitManager.commitAll(projectPath, 'Initial WordPress setup with wp-cc-mcp');
        logger.debug('Initial commit made');

        // Update last accessed time
        sqliteDb.execute(
          'UPDATE projects SET last_accessed = CURRENT_TIMESTAMP, status = ? WHERE id = ?',
          ['active', projectId]
        );

        return {
          projectId,
          name,
          port,
          projectPath,
          gitRemote
        };
      });

      logger.info('WordPress project created successfully', {
        operationId,
        ...result
      });

      return createSuccessResponse(
        `WordPress project '${name}' created successfully`,
        {
          name: result.name,
          port: result.port,
          url: `http://localhost:${result.port}`,
          path: result.projectPath,
          gitInitialized: true,
          dockerRunning: true,
          wordPressVersion: this.wordPressVersion
        }
      );

    } catch (error) {
      logger.logError(error, {
        operation: 'create-project',
        operationId,
        name,
        port,
        projectPath
      });

      // Cleanup on failure
      await this.cleanupFailedProject(name, projectPath);

      return createErrorResponse(
        `Failed to create project '${name}': ${error.message}`,
        { 
          name, 
          port, 
          operationId 
        }
      );
    }
  }

  /**
   * List all WordPress projects with current status
   * @returns {Promise<Object>} Projects list
   */
  async listProjects() {
    await this.initialize();

    try {
      logger.debug('Listing all projects');
      
      const projects = sqliteDb.query(
        'SELECT * FROM projects ORDER BY last_accessed DESC'
      );
      
      if (projects.length === 0) {
        return createSuccessResponse(
          'No WordPress projects found',
          { count: 0, projects: [] }
        );
      }

      // Enhance projects with runtime status
      const enhancedProjects = await Promise.all(
        projects.map(async (project) => {
          try {
            const dockerStatus = await this.dockerManager.getContainerStatus(project.name);
            const configuration = project.configuration ? JSON.parse(project.configuration) : {};
            
            return {
              ...project,
              dockerStatus,
              isActive: Boolean(project.active),
              url: `http://localhost:${project.port}`,
              createdAt: new Date(project.created_at).toLocaleDateString(),
              lastAccessed: new Date(project.last_accessed).toLocaleDateString(),
              wordPressVersion: configuration.wordPressVersion || 'unknown'
            };
          } catch (error) {
            logger.warn('Error checking project status', {
              project: project.name,
              error: error.message
            });
            
            return {
              ...project,
              dockerStatus: 'unknown',
              isActive: Boolean(project.active),
              url: `http://localhost:${project.port}`,
              createdAt: new Date(project.created_at).toLocaleDateString(),
              lastAccessed: new Date(project.last_accessed).toLocaleDateString(),
              wordPressVersion: 'unknown'
            };
          }
        })
      );

      // Prepare table data
      const columns = [
        { key: 'name', header: 'Project Name' },
        { key: 'port', header: 'Port' },
        { key: 'dockerStatus', header: 'Status' },
        { key: 'isActive', header: 'Active', formatter: (active) => active ? '✓' : '' },
        { key: 'wordPressVersion', header: 'WP Version' },
        { key: 'lastAccessed', header: 'Last Accessed' }
      ];

      logger.debug('Projects listed successfully', {
        count: enhancedProjects.length,
        activeCount: enhancedProjects.filter(p => p.isActive).length
      });

      return createTableResponse(
        enhancedProjects,
        columns,
        `WordPress Projects (${enhancedProjects.length} total)`
      );

    } catch (error) {
      logger.logError(error, {
        operation: 'list-projects'
      });
      
      return createErrorResponse(
        `Failed to list projects: ${error.message}`
      );
    }
  }

  /**
   * Switch to a different active project
   * @param {string} name - Project name to switch to
   * @returns {Promise<Object>} Switch result
   */
  async switchProject(name) {
    await this.initialize();

    try {
      logger.info('Switching to project', { name });

      // Find target project
      const project = sqliteDb.queryOne(
        'SELECT * FROM projects WHERE name = ?',
        [name]
      );
      if (!project) {
        return createErrorResponse(`Project '${name}' not found`);
      }

      // Use transaction to ensure consistency
      const result = await sqliteDb.transaction(async () => {
        // Stop all currently active projects
        const activeProjects = sqliteDb.query(
          'SELECT * FROM projects WHERE active = 1'
        );
        
        for (const activeProject of activeProjects) {
          try {
            await this.dockerManager.stopProject(activeProject.name);
            logger.debug('Stopped project', { project: activeProject.name });
          } catch (error) {
            logger.warn('Error stopping project', {
              project: activeProject.name,
              error: error.message
            });
          }
        }

        // Set all projects to inactive
        sqliteDb.execute('UPDATE projects SET active = 0');

        // Start the target project
        await this.dockerManager.startProject(name);
        logger.debug('Started project', { name });

        // Set target project as active
        sqliteDb.execute(
          'UPDATE projects SET active = 1, last_accessed = CURRENT_TIMESTAMP WHERE name = ?',
          [name]
        );

        return {
          name,
          port: project.port,
          url: `http://localhost:${project.port}`,
          previouslyActive: activeProjects.map(p => p.name)
        };
      });

      logger.info('Successfully switched to project', {
        name,
        port: result.port,
        previouslyActive: result.previouslyActive
      });

      return createSuccessResponse(
        `Switched to project '${name}'`,
        {
          project: result.name,
          url: result.url,
          port: result.port,
          previouslyActive: result.previouslyActive
        }
      );

    } catch (error) {
      logger.logError(error, {
        operation: 'switch-project',
        name
      });
      
      return createErrorResponse(
        `Failed to switch to project '${name}': ${error.message}`,
        { name }
      );
    }
  }

  /**
   * Delete a WordPress project
   * @param {string} name - Project name to delete
   * @param {boolean} deleteFiles - Whether to delete project files
   * @returns {Promise<Object>} Deletion result
   */
  async deleteProject(name, deleteFiles = false) {
    await this.initialize();

    try {
      logger.info('Deleting project', { name, deleteFiles });

      // Find target project
      const project = sqliteDb.queryOne(
        'SELECT * FROM projects WHERE name = ?',
        [name]
      );
      if (!project) {
        return createErrorResponse(`Project '${name}' not found`);
      }

      // Use transaction for database operations
      const result = await sqliteDb.transaction(async () => {
        // Stop and remove Docker containers first
        try {
          await this.dockerManager.removeContainers(name);
          await this.dockerManager.removeDockerNetwork(name);
          logger.debug('Docker containers and network removed', { name });
        } catch (error) {
          logger.warn('Error removing Docker resources', {
            name,
            error: error.message
          });
          // Continue with deletion even if Docker cleanup fails
        }

        // Delete from database (migrations will be deleted due to foreign key cascade)
        const deleteInfo = sqliteDb.execute(
          'DELETE FROM projects WHERE id = ?',
          [project.id]
        );

        logger.debug('Project deleted from database', {
          name,
          projectId: project.id,
          changes: deleteInfo.changes
        });

        return {
          name,
          projectPath: project.path,
          deletedFromDatabase: deleteInfo.changes > 0
        };
      });

      // Optionally delete project files (outside transaction)
      let filesDeleted = false;
      if (deleteFiles && await fs.pathExists(result.projectPath)) {
        try {
          await fs.remove(result.projectPath);
          filesDeleted = true;
          logger.debug('Project files deleted', { path: result.projectPath });
        } catch (error) {
          logger.warn('Error deleting project files', {
            path: result.projectPath,
            error: error.message
          });
        }
      }

      logger.info('Project deleted successfully', {
        name,
        filesDeleted,
        databaseDeleted: result.deletedFromDatabase
      });

      return createSuccessResponse(
        `Project '${name}' deleted successfully${deleteFiles ? ' (including files)' : ''}`,
        {
          name,
          filesDeleted,
          databaseDeleted: result.deletedFromDatabase,
          projectPath: result.projectPath
        }
      );

    } catch (error) {
      logger.logError(error, {
        operation: 'delete-project',
        name,
        deleteFiles
      });
      
      return createErrorResponse(
        `Failed to delete project '${name}': ${error.message}`,
        { name, deleteFiles }
      );
    }
  }

  /**
   * Validate project creation inputs
   * @param {string} name - Project name
   * @param {number} port - Port number
   * @returns {Object} Validation result
   */
  validateProjectInputs(name, port) {
    if (!name || typeof name !== 'string') {
      return { valid: false, error: 'Project name is required and must be a string' };
    }

    if (!/^[a-z0-9-]+$/.test(name)) {
      return { 
        valid: false, 
        error: 'Project name must contain only lowercase letters, numbers, and hyphens' 
      };
    }

    if (name.length < 2 || name.length > 50) {
      return { 
        valid: false, 
        error: 'Project name must be between 2 and 50 characters' 
      };
    }

    if (!port || typeof port !== 'number' || port < 1024 || port > 65535) {
      return { 
        valid: false, 
        error: 'Port must be a number between 1024 and 65535' 
      };
    }

    return { valid: true };
  }

  /**
   * Download and extract WordPress
   * @param {string} name - Project name
   * @param {string} projectPath - Project directory path
   * @returns {Promise<void>}
   */
  async downloadWordPress(name, projectPath) {
    const wpUrl = `https://wordpress.org/wordpress-${this.wordPressVersion}.tar.gz`;
    const wpArchive = path.join('/tmp', `wordpress-${name}-${Date.now()}.tar.gz`);
    
    try {
      logger.debug('Downloading WordPress', { version: this.wordPressVersion, url: wpUrl });
      
      // Download WordPress archive
      await commandExecutor.execute(['wget', '-O', wpArchive, wpUrl], {
        timeout: 120000, // 2 minutes
        description: 'Download WordPress archive'
      });
      
      // Extract WordPress
      await commandExecutor.execute(
        ['tar', '-xzf', wpArchive, '-C', projectPath, '--strip-components=1'],
        {
          cwd: projectPath,
          timeout: 60000,
          description: 'Extract WordPress archive'
        }
      );
      
      // Clean up downloaded archive
      await fs.remove(wpArchive);
      
      logger.debug('WordPress downloaded and extracted successfully');
      
    } catch (error) {
      // Clean up on failure
      if (await fs.pathExists(wpArchive)) {
        await fs.remove(wpArchive);
      }
      throw new Error(`Failed to download WordPress: ${error.message}`);
    }
  }

  /**
   * Create project structure (Docker files, configs, etc.)
   * @param {string} projectPath - Project directory path
   * @param {string} name - Project name
   * @param {number} port - Port number
   * @returns {Promise<void>}
   */
  async createProjectStructure(projectPath, name, port) {
    try {
      // Create migrations directory
      await fs.ensureDir(path.join(projectPath, 'migrations'));
      
      // Create Docker configuration files
      await this.createDockerFiles(projectPath, name, port);
      
      // Create WordPress configuration
      await this.createWordPressConfig(projectPath);
      
      // Create .gitignore
      await this.createGitIgnore(projectPath);
      
      logger.debug('Project structure created successfully');
      
    } catch (error) {
      throw new Error(`Failed to create project structure: ${error.message}`);
    }
  }

  /**
   * Clean up failed project creation
   * @param {string} name - Project name
   * @param {string} projectPath - Project directory path
   * @returns {Promise<void>}
   */
  async cleanupFailedProject(name, projectPath) {
    logger.info('Cleaning up failed project creation', { name, projectPath });
    
    try {
      // Remove from database
      sqliteDb.execute('DELETE FROM projects WHERE name = ?', [name]);
      
      // Remove project directory
      if (await fs.pathExists(projectPath)) {
        await fs.remove(projectPath);
      }
      
      // Stop and remove any Docker containers that might have been created
      try {
        await this.dockerManager.removeContainers(name);
        await this.dockerManager.removeDockerNetwork(name);
      } catch (dockerError) {
        logger.warn('Error during Docker cleanup', {
          name,
          error: dockerError.message
        });
      }
      
      logger.debug('Project cleanup completed', { name });
      
    } catch (error) {
      logger.warn('Error during project cleanup', {
        name,
        error: error.message
      });
    }
  }

  /**
   * Wait for WordPress to be accessible
   * @param {number} port - Port number
   * @param {number} maxAttempts - Maximum number of attempts
   * @returns {Promise<boolean>}
   */
  async waitForWordPress(port, maxAttempts = 30) {
    logger.debug('Waiting for WordPress to be ready', { port, maxAttempts });
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(`http://localhost:${port}/wp-admin/install.php`, {
          timeout: 3000
        });
        
        if (response.ok) {
          logger.debug('WordPress is ready', { port, attempt });
          return true;
        }
      } catch (error) {
        logger.debug('WordPress not ready yet', { 
          port, 
          attempt, 
          error: error.message 
        });
      }
      
      // Wait 2 seconds before next attempt
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error(`WordPress did not start within ${maxAttempts * 2} seconds`);
  }

  /**
   * Get project information
   * @param {string} name - Project name
   * @returns {Object|null} Project information
   */
  getProject(name) {
    return sqliteDb.queryOne('SELECT * FROM projects WHERE name = ?', [name]);
  }

  /**
   * Update project last accessed time
   * @param {string} name - Project name
   */
  updateLastAccessed(name) {
    sqliteDb.execute(
      'UPDATE projects SET last_accessed = CURRENT_TIMESTAMP WHERE name = ?',
      [name]
    );
  }

  async createDockerFiles(projectPath, projectName, port) {
    // Create Dockerfile
    const dockerfile = `FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \\
    software-properties-common \\
    && add-apt-repository ppa:ondrej/php \\
    && apt-get update && apt-get install -y \\
    apache2 \\
    php8.3 \\
    php8.3-cli \\
    php8.3-common \\
    php8.3-mysql \\
    php8.3-xml \\
    php8.3-xmlrpc \\
    php8.3-curl \\
    php8.3-gd \\
    php8.3-imagick \\
    php8.3-mbstring \\
    php8.3-zip \\
    php8.3-intl \\
    php8.3-bz2 \\
    php8.3-bcmath \\
    php8.3-soap \\
    libapache2-mod-php8.3 \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

# Enable Apache modules
RUN a2enmod rewrite headers expires

# Configure Apache
RUN echo "ServerName localhost" >> /etc/apache2/apache2.conf

# Configure PHP
RUN echo "memory_limit = 256M" >> /etc/php/8.3/apache2/php.ini \\
    && echo "upload_max_filesize = 64M" >> /etc/php/8.3/apache2/php.ini \\
    && echo "post_max_size = 64M" >> /etc/php/8.3/apache2/php.ini \\
    && echo "max_execution_time = 300" >> /etc/php/8.3/apache2/php.ini

# Install WP-CLI
RUN curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar \\
    && chmod +x wp-cli.phar \\
    && mv wp-cli.phar /usr/local/bin/wp

# Set document root
WORKDIR /var/www/html

# Configure Apache virtual host
RUN echo '<VirtualHost *:80>\\n\\
    DocumentRoot /var/www/html\\n\\
    <Directory /var/www/html>\\n\\
        Options Indexes FollowSymLinks\\n\\
        AllowOverride All\\n\\
        Require all granted\\n\\
    </Directory>\\n\\
</VirtualHost>' > /etc/apache2/sites-available/000-default.conf

EXPOSE 80

CMD ["apache2ctl", "-D", "FOREGROUND"]`;

    await fs.writeFile(path.join(projectPath, 'Dockerfile'), dockerfile);

    // Create docker-compose.yml
    const dockerCompose = `version: '3.8'

services:
  wordpress:
    build: .
    container_name: wp-${projectName}-app
    ports:
      - "${port}:80"
    volumes:
      - .:/var/www/html
    environment:
      WORDPRESS_DB_HOST: db:3306
      WORDPRESS_DB_NAME: wordpress
      WORDPRESS_DB_USER: wordpress
      WORDPRESS_DB_PASSWORD: wordpress
    depends_on:
      - db
    networks:
      - wp-${projectName}-network

  db:
    image: mysql:8.0
    container_name: wp-${projectName}-db
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: wordpress
      MYSQL_USER: wordpress
      MYSQL_PASSWORD: wordpress
    volumes:
      - wp-${projectName}-db:/var/lib/mysql
    ports:
      - "${port + 1000}:3306"
    networks:
      - wp-${projectName}-network

volumes:
  wp-${projectName}-db:

networks:
  wp-${projectName}-network:
    driver: bridge`;

    await fs.writeFile(path.join(projectPath, 'docker-compose.yml'), dockerCompose);
  }

  async createWordPressConfig(projectPath) {
    const wpConfig = `<?php
/**
 * WordPress Configuration
 * 
 * This file supports both development and production environments
 */

// Environment detection
if (file_exists(__DIR__ . '/wp-config-local.php')) {
    // Local development settings
    require_once(__DIR__ . '/wp-config-local.php');
} else {
    // Production settings
    define('DB_NAME', getenv('DB_NAME') ?: 'wordpress');
    define('DB_USER', getenv('DB_USER') ?: 'wordpress');
    define('DB_PASSWORD', getenv('DB_PASSWORD') ?: 'wordpress');
    define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
}

define('DB_CHARSET', 'utf8mb4');
define('DB_COLLATE', '');

// Authentication keys and salts
define('AUTH_KEY',         'put your unique phrase here');
define('SECURE_AUTH_KEY',  'put your unique phrase here');
define('LOGGED_IN_KEY',    'put your unique phrase here');
define('NONCE_KEY',        'put your unique phrase here');
define('AUTH_SALT',        'put your unique phrase here');
define('SECURE_AUTH_SALT', 'put your unique phrase here');
define('LOGGED_IN_SALT',   'put your unique phrase here');
define('NONCE_SALT',       'put your unique phrase here');

$table_prefix = 'wp_';

define('WP_DEBUG', false);

if (!defined('ABSPATH')) {
    define('ABSPATH', __DIR__ . '/');
}

require_once ABSPATH . 'wp-settings.php';`;

    await fs.writeFile(path.join(projectPath, 'wp-config.php'), wpConfig);

    // Create local config
    const wpConfigLocal = `<?php
// Local development database settings
define('DB_NAME', 'wordpress');
define('DB_USER', 'wordpress');
define('DB_PASSWORD', 'wordpress');
define('DB_HOST', 'db:3306');

// Development settings
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);`;

    await fs.writeFile(path.join(projectPath, 'wp-config-local.php'), wpConfigLocal);
  }

  async createGitIgnore(projectPath) {
    const gitignore = `# WordPress core files (we're tracking these for SiteGround deployment)
# But ignore local-only files
wp-config-local.php
.env
.env.local

# Uploads directory (large files)
wp-content/uploads/

# Cache and temp files
wp-content/cache/
wp-content/temp/
wp-content/upgrade/

# Logs
*.log
wp-content/debug.log

# Database dumps (except migrations)
*.sql
!migrations/*.sql

# OS files
.DS_Store
Thumbs.db

# Editor files
.vscode/
.idea/
*.swp
*.swo

# Docker
docker-compose.override.yml

# Node modules (if any)
node_modules/

# Backup files
*.bak
*.backup
*~`;

    await fs.writeFile(path.join(projectPath, '.gitignore'), gitignore);
  }

  async waitForWordPress(port, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`http://localhost:${port}/wp-admin/install.php`);
        if (response.ok) {
          return true;
        }
      } catch (error) {
        // Not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    throw new Error('WordPress did not start in time');
  }

  getProject(name) {
    return this.db.prepare('SELECT * FROM projects WHERE name = ?').get(name);
  }

  updateLastAccessed(name) {
    this.db.prepare('UPDATE projects SET last_accessed = CURRENT_TIMESTAMP WHERE name = ?').run(name);
  }
}