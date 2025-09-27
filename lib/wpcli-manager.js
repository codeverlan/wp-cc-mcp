/**
 * WP-CLI Manager
 * Provides direct WordPress CLI command execution for comprehensive site management
 */

import { commandExecutor } from './command-executor.js';
import { config } from './config-manager.js';
import { logger } from './logger.js';
import { csvParser } from './csv-parser.js';
import { 
  createTextResponse, 
  createJsonResponse, 
  createErrorResponse,
  createSuccessResponse,
  createCommandResponse
} from './mcp-response.js';
import path from 'path';
import fs from 'fs-extra';

export class WPCLIManager {
  constructor() {
    this.projectsDir = config.getProjectsDir();
  }

  /**
   * Execute WP-CLI command in Docker container using new command executor
   */
  async executeWPCLI(project, command, args = [], options = {}) {
    const projectPath = config.getProjectPath(project);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project ${project} not found`);
    }

    try {
      // Get the actual container name dynamically
      const containerName = options.containerName || await commandExecutor.getContainerName(project);
      
      const result = await commandExecutor.executeWpCli(project, command, args, {
        ...options,
        containerName,
        cwd: projectPath
      });

      logger.logWpCliCommand(project, command, args, result);

      return result;
    } catch (error) {
      logger.logError(error, {
        operation: 'wp-cli-execute',
        project,
        command,
        args
      });
      throw error;
    }
  }

  /**
   * Post Management
   */
  async createPost(project, data) {
    const args = [];
    
    if (data.title) args.push(`--post_title="${data.title}"`);
    if (data.content) args.push(`--post_content="${data.content}"`);
    if (data.status) args.push(`--post_status=${data.status}`);
    if (data.author) args.push(`--post_author=${data.author}`);
    if (data.category) args.push(`--post_category=${data.category}`);
    if (data.tags) args.push(`--tags_input="${data.tags}"`);
    if (data.meta) {
      for (const [key, value] of Object.entries(data.meta)) {
        args.push(`--meta_input=${key}="${value}"`);
      }
    }
    
    return this.executeWPCLI(project, 'post', ['create', ...args, '--porcelain']);
  }

  async updatePost(project, postId, data) {
    const args = [postId];
    
    if (data.title) args.push(`--post_title="${data.title}"`);
    if (data.content) args.push(`--post_content="${data.content}"`);
    if (data.status) args.push(`--post_status=${data.status}`);
    if (data.category) args.push(`--post_category=${data.category}`);
    if (data.tags) args.push(`--tags_input="${data.tags}"`);
    
    return this.executeWPCLI(project, 'post', ['update', ...args]);
  }

  async deletePost(project, postId, force = false) {
    const args = [postId];
    if (force) args.push('--force');
    
    return this.executeWPCLI(project, 'post', ['delete', ...args]);
  }

  async listPosts(project, options = {}) {
    const args = ['list'];
    
    if (options.status) args.push(`--post_status=${options.status}`);
    if (options.number) args.push(`--posts_per_page=${options.number}`);
    if (options.fields) args.push(`--fields=${options.fields}`);
    args.push('--format=json');
    
    const result = await this.executeWPCLI(project, 'post', args);
    if (result.success) {
      result.posts = JSON.parse(result.output);
    }
    return result;
  }

  /**
   * User Management
   */
  async createUser(project, username, email, options = {}) {
    const args = [username, email];
    
    if (options.role) args.push(`--role=${options.role}`);
    if (options.displayName) args.push(`--display_name="${options.displayName}"`);
    if (options.firstName) args.push(`--first_name="${options.firstName}"`);
    if (options.lastName) args.push(`--last_name="${options.lastName}"`);
    
    return this.executeWPCLI(project, 'user', ['create', ...args]);
  }

  async updateUser(project, userId, updates = {}) {
    const args = [userId];
    
    if (updates.email) args.push(`--user_email=${updates.email}`);
    if (updates.displayName) args.push(`--display_name="${updates.displayName}"`);
    if (updates.role) args.push(`--role=${updates.role}`);
    
    return this.executeWPCLI(project, 'user', ['update', ...args]);
  }

  async deleteUser(project, userId, reassign = 1) {
    return this.executeWPCLI(project, 'user', ['delete', userId, `--reassign=${reassign}`, '--yes']);
  }

  async listUsers(project, role = null) {
    const args = ['list', '--format=json'];
    if (role) args.push(`--role=${role}`);
    
    const result = await this.executeWPCLI(project, 'user', args);
    if (result.success) {
      result.users = JSON.parse(result.output);
    }
    return result;
  }

  /**
   * Plugin Management
   */
  async installPlugin(project, plugin, activate = true) {
    const args = ['install', plugin];
    if (activate) args.push('--activate');
    
    return this.executeWPCLI(project, 'plugin', args);
  }

  async activatePlugin(project, plugin) {
    return this.executeWPCLI(project, 'plugin', ['activate', plugin]);
  }

  async deactivatePlugin(project, plugin) {
    return this.executeWPCLI(project, 'plugin', ['deactivate', plugin]);
  }

  async deletePlugin(project, plugin) {
    return this.executeWPCLI(project, 'plugin', ['delete', plugin]);
  }

  async listPlugins(project, status = null) {
    const args = ['list', '--format=json'];
    if (status) args.push(`--status=${status}`);
    
    const result = await this.executeWPCLI(project, 'plugin', args);
    if (result.success) {
      result.plugins = JSON.parse(result.output);
    }
    return result;
  }

  /**
   * Theme Management
   */
  async installTheme(project, theme, activate = false) {
    const args = ['install', theme];
    if (activate) args.push('--activate');
    
    return this.executeWPCLI(project, 'theme', args);
  }

  async activateTheme(project, theme) {
    return this.executeWPCLI(project, 'theme', ['activate', theme]);
  }

  async deleteTheme(project, theme) {
    return this.executeWPCLI(project, 'theme', ['delete', theme]);
  }

  async listThemes(project) {
    const result = await this.executeWPCLI(project, 'theme', ['list', '--format=json']);
    if (result.success) {
      result.themes = JSON.parse(result.output);
    }
    return result;
  }

  /**
   * Media Management
   */
  async importMedia(project, filePath, options = {}) {
    const args = [filePath];
    
    if (options.title) args.push(`--title="${options.title}"`);
    if (options.caption) args.push(`--caption="${options.caption}"`);
    if (options.description) args.push(`--desc="${options.description}"`);
    if (options.alt) args.push(`--alt="${options.alt}"`);
    if (options.featured) args.push(`--featured_image`);
    if (options.postId) args.push(`--post_id=${options.postId}`);
    args.push('--porcelain');
    
    return this.executeWPCLI(project, 'media', ['import', ...args]);
  }

  async regenerateMedia(project, options = {}) {
    const args = ['regenerate'];
    
    if (options.onlyMissing) args.push('--only-missing');
    if (options.imageSize) args.push(`--image_size=${options.imageSize}`);
    if (options.skipDelete) args.push('--skip-delete');
    args.push('--yes');
    
    return this.executeWPCLI(project, 'media', args);
  }

  /**
   * Taxonomy Management
   */
  async createTerm(project, taxonomy, term, options = {}) {
    // Quote the term name if it contains spaces
    const quotedTerm = term.includes(' ') ? `"${term}"` : term;
    const args = [taxonomy, quotedTerm];
    
    if (options.description) args.push(`--description="${options.description}"`);
    if (options.parent) args.push(`--parent=${options.parent}`);
    if (options.slug) args.push(`--slug=${options.slug}`);
    args.push('--porcelain');
    
    return this.executeWPCLI(project, 'term', ['create', ...args]);
  }

  async updateTerm(project, taxonomy, termId, updates = {}) {
    const args = [taxonomy, termId];
    
    if (updates.name) args.push(`--name="${updates.name}"`);
    if (updates.description) args.push(`--description="${updates.description}"`);
    if (updates.slug) args.push(`--slug=${updates.slug}`);
    
    return this.executeWPCLI(project, 'term', ['update', ...args]);
  }

  async deleteTerm(project, taxonomy, termId) {
    return this.executeWPCLI(project, 'term', ['delete', taxonomy, termId]);
  }

  async listTerms(project, taxonomy) {
    const result = await this.executeWPCLI(project, 'term', ['list', taxonomy, '--format=json']);
    if (result.success) {
      result.terms = JSON.parse(result.output);
    }
    return result;
  }

  /**
   * Options Management
   */
  async getOption(project, option) {
    return this.executeWPCLI(project, 'option', ['get', option]);
  }

  async updateOption(project, option, value) {
    return this.executeWPCLI(project, 'option', ['update', option, value]);
  }

  async deleteOption(project, option) {
    return this.executeWPCLI(project, 'option', ['delete', option]);
  }

  /**
   * Database Operations
   */
  async searchReplace(project, search, replace, options = {}) {
    const args = [search, replace];
    
    if (options.tables) args.push(`--tables=${options.tables}`);
    if (options.dryRun) args.push('--dry-run');
    if (options.precise) args.push('--precise');
    if (options.allTablesWithPrefix) args.push('--all-tables-with-prefix');
    
    return this.executeWPCLI(project, 'search-replace', args);
  }

  async optimizeDatabase(project) {
    return this.executeWPCLI(project, 'db', ['optimize']);
  }

  async repairDatabase(project) {
    return this.executeWPCLI(project, 'db', ['repair']);
  }

  /**
   * Cache Management
   */
  async flushCache(project) {
    return this.executeWPCLI(project, 'cache', ['flush']);
  }

  async flushRewrite(project) {
    return this.executeWPCLI(project, 'rewrite', ['flush']);
  }

  async clearTransients(project, options = {}) {
    const args = ['delete'];
    
    if (options.expired) args.push('--expired');
    if (options.all) args.push('--all');
    
    return this.executeWPCLI(project, 'transient', args);
  }

  /**
   * Maintenance Mode
   */
  async enableMaintenance(project) {
    return this.executeWPCLI(project, 'maintenance-mode', ['activate']);
  }

  async disableMaintenance(project) {
    return this.executeWPCLI(project, 'maintenance-mode', ['deactivate']);
  }

  /**
   * Cron Management
   */
  async listCron(project) {
    const result = await this.executeWPCLI(project, 'cron', ['event', 'list', '--format=json']);
    if (result.success) {
      result.events = JSON.parse(result.output);
    }
    return result;
  }

  async runCron(project, hook = null) {
    const args = ['run'];
    if (hook) args.push(`--hook=${hook}`);
    
    return this.executeWPCLI(project, 'cron', ['event', ...args]);
  }

  /**
   * Custom WP-CLI Commands
   */
  async runCustomCommand(project, command, args = []) {
    return this.executeWPCLI(project, command, args);
  }

  /**
   * Bulk Operations with improved CSV parsing and streaming
   */
  async bulkImportCSV(project, csvPath, options = {}) {
    const startTime = Date.now();
    logger.info('Starting bulk CSV import', { project, csvPath });

    try {
      // Validate CSV file first
      const validation = await csvParser.validateFile(csvPath, {
        requiredColumns: options.requiredColumns || ['Article Title', 'title']
      });

      if (!validation.isValid) {
        return createErrorResponse(
          `CSV validation failed: ${validation.errors.join(', ')}`,
          { validation }
        );
      }

      // Parse CSV with proper handling
      const parseResult = await csvParser.parseFile(csvPath);
      
      if (!parseResult.success) {
        return createErrorResponse('Failed to parse CSV file', { parseResult });
      }

      // Convert to WordPress format
      const postData = csvParser.convertToWordPressFormat(
        parseResult.data, 
        options.fieldMapping
      );

      // Create progress tracker
      const progressTracker = csvParser.createProgressTracker(
        'Importing posts', 
        postData.length
      );

      const results = [];
      const errors = [];
      let successCount = 0;
      
      // Process posts with progress tracking
      for (let i = 0; i < postData.length; i++) {
        const post = postData[i];
        
        try {
          const result = await this.createPost(project, post);
          
          if (result.success) {
            successCount++;
          } else {
            errors.push({
              row: i + 1,
              title: post.title,
              error: result.error || 'Unknown error'
            });
          }
          
          results.push({
            row: i + 1,
            title: post.title,
            success: result.success,
            postId: result.success ? result.output : null
          });

          // Report progress
          const progress = progressTracker(i + 1);
          if (progress && options.onProgress) {
            options.onProgress(progress);
          }

        } catch (error) {
          logger.logError(error, {
            operation: 'bulk-import-post',
            project,
            row: i + 1,
            title: post.title
          });
          
          errors.push({
            row: i + 1,
            title: post.title,
            error: error.message
          });
        }
      }

      const executionTime = Date.now() - startTime;
      const summary = {
        totalRows: parseResult.rowCount,
        processed: results.length,
        successful: successCount,
        failed: errors.length,
        executionTime
      };

      logger.info('Bulk CSV import completed', summary);

      return createJsonResponse(
        {
          summary,
          results: options.includeDetails ? results : null,
          errors: errors.length > 0 ? errors : null
        },
        `Bulk import completed: ${successCount}/${results.length} posts created successfully`
      );

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.logError(error, {
        operation: 'bulk-import-csv',
        project,
        csvPath,
        executionTime
      });
      
      return createErrorResponse(
        `Bulk import failed: ${error.message}`,
        { csvPath, executionTime }
      );
    }
  }
}

export default WPCLIManager;