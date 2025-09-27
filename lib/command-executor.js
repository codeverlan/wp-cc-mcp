import { execa } from 'execa';
import { logger } from './logger.js';
import { config } from './config-manager.js';

/**
 * Secure command execution with retry logic, timeouts, and proper error handling
 */
export class CommandExecutor {
  constructor() {
    this.retryConfig = config.getRetryConfig();
  }

  /**
   * Execute a command with arguments safely using execa
   * @param {string} command - Command to execute
   * @param {Array} args - Command arguments
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async execute(command, args = [], options = {}) {
    const startTime = Date.now();
    const execOptions = {
      timeout: options.timeout || config.get('dockerTimeout'),
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      reject: false, // Don't throw on non-zero exit codes
      stripFinalNewline: false,
      ...options.execaOptions
    };

    // Log the command execution
    logger.logCommand(command, args, { cwd: options.cwd });

    let lastError;
    let attempt = 0;
    const maxRetries = options.retries !== undefined ? options.retries : this.retryConfig.maxRetries;

    while (attempt <= maxRetries) {
      try {
        const result = await execa(command, args, execOptions);
        const executionTime = Date.now() - startTime;
        
        // Log the result
        logger.logCommandResult(command, {
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr
        }, executionTime);

        return {
          success: result.exitCode === 0,
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
          executionTime,
          attempt: attempt + 1
        };
      } catch (error) {
        lastError = error;
        const executionTime = Date.now() - startTime;
        
        logger.logError(error, {
          command,
          args,
          attempt: attempt + 1,
          executionTime
        });

        // Don't retry on certain types of errors
        if (this._shouldNotRetry(error)) {
          break;
        }

        attempt++;
        if (attempt <= maxRetries) {
          const delay = this._calculateDelay(attempt);
          logger.debug(`Retrying command in ${delay}ms`, { command, attempt });
          await this._sleep(delay);
        }
      }
    }

    // If we get here, all attempts failed
    const executionTime = Date.now() - startTime;
    return {
      success: false,
      error: lastError.message,
      exitCode: lastError.exitCode || -1,
      stdout: lastError.stdout || '',
      stderr: lastError.stderr || lastError.message,
      executionTime,
      attempts: attempt
    };
  }

  /**
   * Execute Docker command
   * @param {Array} args - Docker arguments
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executeDocker(args, options = {}) {
    const dockerTimeout = options.timeout || config.getDockerTimeout();
    return this.execute('docker', args, {
      ...options,
      timeout: dockerTimeout
    });
  }

  /**
   * Execute WP-CLI command in Docker container
   * @param {string} project - Project name
   * @param {string} command - WP-CLI command
   * @param {Array} args - Command arguments
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executeWpCli(project, command, args = [], options = {}) {
    const containerName = options.containerName || `wp-${project}-app`;
    const wpCliTimeout = options.timeout || config.getWpCliTimeout();
    
    const dockerArgs = [
      'exec',
      containerName,
      config.get('wpCliBin'),
      command,
      ...args,
      '--allow-root'
    ];

    return this.executeDocker(dockerArgs, {
      ...options,
      timeout: wpCliTimeout
    });
  }

  /**
   * Execute GitHub CLI command
   * @param {Array} args - GitHub CLI arguments
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executeGitHub(args, options = {}) {
    return this.execute(config.get('githubCliBin'), args, options);
  }

  /**
   * Execute command with streaming output
   * @param {string} command - Command to execute
   * @param {Array} args - Command arguments
   * @param {Object} options - Execution options
   * @param {Function} onData - Callback for stdout data
   * @returns {Promise<Object>} Execution result
   */
  async executeWithStreaming(command, args = [], options = {}, onData = null) {
    const startTime = Date.now();
    const execOptions = {
      timeout: options.timeout || config.get('dockerTimeout'),
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      ...options.execaOptions
    };

    logger.logCommand(command, args, { streaming: true });

    try {
      const subprocess = execa(command, args, execOptions);
      
      if (onData && subprocess.stdout) {
        subprocess.stdout.on('data', (data) => {
          onData(data.toString());
        });
      }

      const result = await subprocess;
      const executionTime = Date.now() - startTime;
      
      logger.logCommandResult(command, {
        exitCode: result.exitCode,
        stdout: result.stdout?.slice(0, 500), // Truncate for logging
        stderr: result.stderr
      }, executionTime);

      return {
        success: result.exitCode === 0,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        executionTime
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.logError(error, { command, args, streaming: true, executionTime });
      
      return {
        success: false,
        error: error.message,
        exitCode: error.exitCode || -1,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        executionTime
      };
    }
  }

  /**
   * Check if a command/binary exists
   * @param {string} command - Command to check
   * @returns {Promise<boolean>} Whether command exists
   */
  async commandExists(command) {
    try {
      const result = await this.execute('which', [command], { 
        timeout: 5000,
        retries: 0 
      });
      return result.success;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get Docker container name for project
   * @param {string} project - Project name
   * @param {string} service - Service name (default: 'app')
   * @returns {Promise<string>} Container name
   */
  async getContainerName(project, service = 'app') {
    // Try to get actual container name from docker compose
    const result = await this.executeDocker([
      'compose', 'ps', '-q', service
    ], {
      cwd: config.getProjectPath(project),
      timeout: 10000,
      retries: 0
    });

    if (result.success && result.stdout.trim()) {
      const containerId = result.stdout.trim().split('\n')[0];
      
      // Get the actual container name
      const nameResult = await this.executeDocker([
        'inspect', '--format', '{{.Name}}', containerId
      ], { timeout: 5000, retries: 0 });

      if (nameResult.success) {
        return nameResult.stdout.trim().replace(/^\//, ''); // Remove leading slash
      }
    }

    // Fallback to naming convention
    return `wp-${project}-${service}`;
  }

  /**
   * Calculate delay for retry attempts with exponential backoff
   * @param {number} attempt - Attempt number (1-based)
   * @returns {number} Delay in milliseconds
   */
  _calculateDelay(attempt) {
    const baseDelay = this.retryConfig.delay;
    return Math.min(baseDelay * Math.pow(2, attempt - 1), 30000); // Max 30 seconds
  }

  /**
   * Determine if an error should not be retried
   * @param {Error} error - The error that occurred
   * @returns {boolean} Whether retry should be skipped
   */
  _shouldNotRetry(error) {
    // Don't retry on certain error types
    if (error.code === 'ENOENT') return true; // Command not found
    if (error.code === 'EACCES') return true; // Permission denied
    if (error.signal === 'SIGTERM') return true; // Terminated
    if (error.signal === 'SIGKILL') return true; // Killed
    
    // Don't retry on Docker errors that indicate missing containers
    if (error.stderr && error.stderr.includes('No such container')) return true;
    if (error.stderr && error.stderr.includes('not found')) return true;
    
    return false;
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after delay
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const commandExecutor = new CommandExecutor();