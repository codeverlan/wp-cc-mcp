import { ConfigManager, config } from './config-manager.js';
import path from 'path';
import os from 'os';

describe('ConfigManager', () => {
  let configManager;

  beforeEach(() => {
    configManager = new ConfigManager();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(configManager).toBeInstanceOf(ConfigManager);
      expect(configManager.get('projectsDir')).toContain('wp-projects');
    });
  });

  describe('get method', () => {
    it('should return configuration values', () => {
      expect(configManager.get('logLevel')).toBe('info');
      expect(configManager.get('maxRetries')).toBe(3);
    });

    it('should throw error for non-existent keys', () => {
      expect(() => configManager.get('nonExistentKey')).toThrow();
    });
  });

  describe('helper methods', () => {
    it('should return correct projects directory', () => {
      const projectsDir = configManager.getProjectsDir();
      expect(path.isAbsolute(projectsDir)).toBe(true);
      expect(projectsDir).toContain('wp-projects');
    });

    it('should return correct project path', () => {
      const projectPath = configManager.getProjectPath('test-project');
      expect(projectPath).toContain('test-project');
      expect(path.isAbsolute(projectPath)).toBe(true);
    });

    it('should return log configuration', () => {
      const logConfig = configManager.getLogConfig();
      expect(logConfig).toHaveProperty('level');
      expect(logConfig).toHaveProperty('file');
    });

    it('should return retry configuration', () => {
      const retryConfig = configManager.getRetryConfig();
      expect(retryConfig).toHaveProperty('maxRetries');
      expect(retryConfig).toHaveProperty('delay');
      expect(retryConfig.maxRetries).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validation', () => {
    it('should validate default configuration successfully', () => {
      const validation = configManager.validate();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid configuration', () => {
      // Create a config manager with invalid values
      const invalidConfig = new ConfigManager();
      invalidConfig._config.dockerTimeout = -1;
      invalidConfig._config.maxRetries = -1;
      
      const validation = invalidConfig.validate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('singleton instance', () => {
    it('should provide a singleton config instance', () => {
      expect(config).toBeInstanceOf(ConfigManager);
      expect(config.get('logLevel')).toBeDefined();
    });
  });

  describe('environment variable handling', () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should respect environment variables', () => {
      process.env.WP_PROJECTS_DIR = '/custom/projects/dir';
      process.env.LOG_LEVEL = 'debug';
      process.env.MAX_RETRIES = '5';

      const envConfig = new ConfigManager();
      
      expect(envConfig.get('projectsDir')).toBe('/custom/projects/dir');
      expect(envConfig.get('logLevel')).toBe('debug');
      expect(envConfig.get('maxRetries')).toBe(5);
    });
  });
});