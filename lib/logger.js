import winston from 'winston';
import { config } from './config-manager.js';
import fs from 'fs-extra';
import path from 'path';

class Logger {
  constructor() {
    this.logConfig = config.getLogConfig();
    this.logger = this._createLogger();
    this.requestId = null;
  }

  _createLogger() {
    // Ensure log directory exists
    const logDir = path.dirname(this.logConfig.file);
    fs.ensureDirSync(logDir);

    const formats = [
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ];

    // Add request ID if available
    const addRequestId = winston.format((info) => {
      if (this.requestId) {
        info.requestId = this.requestId;
      }
      return info;
    });
    formats.unshift(addRequestId());

    return winston.createLogger({
      level: this.logConfig.level,
      format: winston.format.combine(...formats),
      defaultMeta: { service: 'wp-cc-mcp' },
      transports: [
        // File transport
        new winston.transports.File({
          filename: this.logConfig.file,
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
          tailable: true
        }),
        // Console transport for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ],
      // Handle uncaught exceptions
      exceptionHandlers: [
        new winston.transports.File({
          filename: path.join(logDir, 'exceptions.log')
        })
      ],
      rejectionHandlers: [
        new winston.transports.File({
          filename: path.join(logDir, 'rejections.log')
        })
      ]
    });
  }

  setRequestId(requestId) {
    this.requestId = requestId;
    return this;
  }

  clearRequestId() {
    this.requestId = null;
    return this;
  }

  // Logging methods
  error(message, meta = {}) {
    this.logger.error(message, meta);
  }

  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  verbose(message, meta = {}) {
    this.logger.verbose(message, meta);
  }

  // Specialized logging methods
  logToolCall(toolName, args, meta = {}) {
    this.info(`Tool called: ${toolName}`, {
      tool: toolName,
      args: args,
      ...meta
    });
  }

  logToolResult(toolName, result, executionTime, meta = {}) {
    this.info(`Tool completed: ${toolName}`, {
      tool: toolName,
      executionTime,
      success: !result.error,
      ...meta
    });
  }

  logCommand(command, args, meta = {}) {
    this.debug(`Executing command: ${command}`, {
      command,
      args,
      ...meta
    });
  }

  logCommandResult(command, result, executionTime, meta = {}) {
    const level = result.exitCode === 0 ? 'debug' : 'warn';
    this.logger.log(level, `Command result: ${command}`, {
      command,
      exitCode: result.exitCode,
      executionTime,
      stdout: result.stdout?.slice(0, 1000), // Truncate large outputs
      stderr: result.stderr?.slice(0, 1000),
      ...meta
    });
  }

  logError(error, context = {}) {
    this.error(`Error: ${error.message}`, {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context
    });
  }

  // Performance logging
  time(label) {
    return {
      label,
      start: Date.now(),
      end: () => {
        const duration = Date.now() - this.start;
        this.debug(`Timer: ${label}`, { duration });
        return duration;
      }
    };
  }

  // Health check logging
  logHealthCheck(component, status, details = {}) {
    const level = status === 'healthy' ? 'info' : 'warn';
    this.logger.log(level, `Health check: ${component}`, {
      component,
      status,
      details
    });
  }

  // Docker-specific logging
  logDockerOperation(operation, container, result, meta = {}) {
    this.info(`Docker ${operation}`, {
      operation,
      container,
      success: result.success,
      ...meta
    });
  }

  // WP-CLI specific logging
  logWpCliCommand(project, command, args, result, meta = {}) {
    const level = result.success ? 'info' : 'warn';
    this.logger.log(level, `WP-CLI: ${command}`, {
      project,
      command,
      args,
      success: result.success,
      output: result.output?.slice(0, 500), // Truncate output
      ...meta
    });
  }

  // Child logger with context
  child(context = {}) {
    const childLogger = Object.create(this);
    childLogger._childContext = { ...this._childContext, ...context };
    
    // Override logging methods to include child context
    ['error', 'warn', 'info', 'debug', 'verbose'].forEach(level => {
      childLogger[level] = (message, meta = {}) => {
        this.logger[level](message, { ...childLogger._childContext, ...meta });
      };
    });

    return childLogger;
  }
}

// Create singleton logger instance
export const logger = new Logger();

// Export class for testing
export { Logger };