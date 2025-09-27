import dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Centralized configuration management
 * Single source of truth for all configuration values
 */
export class ConfigManager {
  constructor() {
    this._config = this._loadConfig();
  }

  _loadConfig() {
    const homeDir = os.homedir();
    const defaultProjectsDir = path.join(homeDir, 'projects', 'wp-projects');

    return {
      // Core paths
      projectsDir: process.env.WP_PROJECTS_DIR || defaultProjectsDir,
      homeDir,
      
      // Database
      dbPath: process.env.WP_MCP_DB_PATH || path.join(__dirname, '..', 'projects.db'),
      
      // Docker settings
      dockerComposeBin: process.env.DOCKER_COMPOSE_BIN || 'docker',
      dockerComposeCommand: process.env.DOCKER_COMPOSE_COMMAND || 'compose',
      
      // Timeout settings (in milliseconds)
      dockerTimeout: parseInt(process.env.DOCKER_TIMEOUT || '300000'), // 5 minutes
      wpCliTimeout: parseInt(process.env.WP_CLI_TIMEOUT || '120000'),   // 2 minutes
      downloadTimeout: parseInt(process.env.DOWNLOAD_TIMEOUT || '60000'), // 1 minute
      
      // Logging
      logLevel: process.env.LOG_LEVEL || 'info',
      logFile: process.env.LOG_FILE || path.join(__dirname, '..', 'logs', 'wp-mcp.log'),
      
      // Network settings
      maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
      retryDelay: parseInt(process.env.RETRY_DELAY || '1000'), // 1 second
      
      // Security
      credentialService: process.env.CREDENTIAL_SERVICE || 'wp-cc-mcp',
      
      // Feature flags
      enableStreamingProgress: process.env.ENABLE_STREAMING_PROGRESS === 'true',
      enableHealthChecks: process.env.ENABLE_HEALTH_CHECKS !== 'false', // default true
      
      // External tools
      wpCliBin: process.env.WP_CLI_BIN || 'wp',
      githubCliBin: process.env.GITHUB_CLI_BIN || 'gh',
      unzipBin: process.env.UNZIP_BIN || 'unzip',
    };
  }

  get(key) {
    if (key in this._config) {
      return this._config[key];
    }
    throw new Error(`Configuration key '${key}' not found`);
  }

  getAll() {
    return { ...this._config };
  }

  // Helper methods for common configurations
  getProjectsDir() {
    return this.get('projectsDir');
  }

  getProjectPath(projectName) {
    return path.join(this.getProjectsDir(), projectName);
  }

  getDatabasePath() {
    return this.get('dbPath');
  }

  getDockerTimeout() {
    return this.get('dockerTimeout');
  }

  getWpCliTimeout() {
    return this.get('wpCliTimeout');
  }

  getLogConfig() {
    return {
      level: this.get('logLevel'),
      file: this.get('logFile')
    };
  }

  getRetryConfig() {
    return {
      maxRetries: this.get('maxRetries'),
      delay: this.get('retryDelay')
    };
  }

  // Validation method
  validate() {
    const errors = [];
    
    // Check required paths exist or can be created
    const projectsDir = this.getProjectsDir();
    if (!path.isAbsolute(projectsDir)) {
      errors.push(`Projects directory must be absolute path: ${projectsDir}`);
    }

    // Validate timeouts
    if (this.get('dockerTimeout') <= 0) {
      errors.push('Docker timeout must be positive');
    }

    if (this.get('wpCliTimeout') <= 0) {
      errors.push('WP-CLI timeout must be positive');
    }

    // Validate retry settings
    if (this.get('maxRetries') < 0) {
      errors.push('Max retries must be non-negative');
    }

    if (this.get('retryDelay') <= 0) {
      errors.push('Retry delay must be positive');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Singleton instance
export const config = new ConfigManager();