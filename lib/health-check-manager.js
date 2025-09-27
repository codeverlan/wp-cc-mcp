import { commandExecutor } from './command-executor.js';
import { config } from './config-manager.js';
import { logger } from './logger.js';
import { createTextResponse, createJsonResponse } from './mcp-response.js';
import fs from 'fs-extra';
import fetch from 'node-fetch';

/**
 * Health Check Manager
 * Validates system dependencies and environment health
 */
export class HealthCheckManager {
  constructor() {
    this.checks = new Map();
    this._registerChecks();
  }

  /**
   * Register all health checks
   */
  _registerChecks() {
    this.checks.set('docker', this._checkDocker.bind(this));
    this.checks.set('docker-compose', this._checkDockerCompose.bind(this));
    this.checks.set('wp-cli', this._checkWpCli.bind(this));
    this.checks.set('github-cli', this._checkGitHubCli.bind(this));
    this.checks.set('unzip', this._checkUnzip.bind(this));
    this.checks.set('git', this._checkGit.bind(this));
    this.checks.set('network', this._checkNetworkConnectivity.bind(this));
    this.checks.set('filesystem', this._checkFilesystem.bind(this));
    this.checks.set('node-version', this._checkNodeVersion.bind(this));
  }

  /**
   * Run all health checks
   * @returns {Promise<Object>} Health check results
   */
  async runAllChecks() {
    const results = new Map();
    const startTime = Date.now();

    logger.info('Starting comprehensive health checks');

    for (const [name, checkFunction] of this.checks) {
      try {
        logger.debug(`Running health check: ${name}`);
        const result = await checkFunction();
        results.set(name, result);
        logger.logHealthCheck(name, result.status, result.details);
      } catch (error) {
        const errorResult = {
          status: 'error',
          message: `Failed to run check: ${error.message}`,
          details: { error: error.message }
        };
        results.set(name, errorResult);
        logger.logHealthCheck(name, 'error', errorResult.details);
      }
    }

    const totalTime = Date.now() - startTime;
    const summary = this._generateSummary(results, totalTime);

    logger.info('Health checks completed', {
      totalTime,
      healthy: summary.healthyCount,
      warnings: summary.warningCount,
      errors: summary.errorCount
    });

    return {
      summary,
      results: Object.fromEntries(results),
      executionTime: totalTime
    };
  }

  /**
   * Run specific health checks
   * @param {Array<string>} checkNames - Names of checks to run
   * @returns {Promise<Object>} Health check results
   */
  async runSpecificChecks(checkNames) {
    const results = new Map();
    const startTime = Date.now();

    for (const name of checkNames) {
      if (!this.checks.has(name)) {
        results.set(name, {
          status: 'error',
          message: `Unknown health check: ${name}`,
          details: {}
        });
        continue;
      }

      try {
        const result = await this.checks.get(name)();
        results.set(name, result);
        logger.logHealthCheck(name, result.status, result.details);
      } catch (error) {
        const errorResult = {
          status: 'error',
          message: `Failed to run check: ${error.message}`,
          details: { error: error.message }
        };
        results.set(name, errorResult);
        logger.logHealthCheck(name, 'error', errorResult.details);
      }
    }

    const totalTime = Date.now() - startTime;
    const summary = this._generateSummary(results, totalTime);

    return {
      summary,
      results: Object.fromEntries(results),
      executionTime: totalTime
    };
  }

  /**
   * Check project-specific health
   * @param {string} project - Project name
   * @returns {Promise<Object>} Project health status
   */
  async checkProjectHealth(project) {
    const projectPath = config.getProjectPath(project);
    const results = new Map();

    // Check if project exists
    results.set('project-exists', await this._checkProjectExists(project));
    
    // Check Docker containers if project exists
    if (await fs.pathExists(projectPath)) {
      results.set('containers', await this._checkProjectContainers(project));
      results.set('wordpress-health', await this._checkWordPressHealth(project));
      results.set('docker-compose-file', await this._checkDockerComposeFile(project));
    }

    const summary = this._generateSummary(results, 0);
    return {
      project,
      summary,
      results: Object.fromEntries(results)
    };
  }

  // Individual health check implementations

  async _checkDocker() {
    const result = await commandExecutor.execute('docker', ['--version'], { timeout: 10000 });
    
    if (!result.success) {
      return {
        status: 'error',
        message: 'Docker is not installed or not accessible',
        details: { error: result.stderr }
      };
    }

    // Check if Docker daemon is running
    const pingResult = await commandExecutor.execute('docker', ['info'], { timeout: 10000 });
    
    if (!pingResult.success) {
      return {
        status: 'error',
        message: 'Docker daemon is not running',
        details: { error: pingResult.stderr }
      };
    }

    return {
      status: 'healthy',
      message: 'Docker is installed and running',
      details: {
        version: result.stdout.trim(),
        daemon: 'running'
      }
    };
  }

  async _checkDockerCompose() {
    const result = await commandExecutor.execute('docker', ['compose', 'version'], { timeout: 10000 });
    
    if (!result.success) {
      return {
        status: 'error',
        message: 'Docker Compose is not available',
        details: { error: result.stderr }
      };
    }

    return {
      status: 'healthy',
      message: 'Docker Compose is available',
      details: {
        version: result.stdout.trim()
      }
    };
  }

  async _checkWpCli() {
    const wpCliBin = config.get('wpCliBin');
    const exists = await commandExecutor.commandExists(wpCliBin);
    
    if (!exists) {
      return {
        status: 'error',
        message: `WP-CLI not found at: ${wpCliBin}`,
        details: { binary: wpCliBin }
      };
    }

    const result = await commandExecutor.execute(wpCliBin, ['--version'], { timeout: 10000 });
    
    if (!result.success) {
      return {
        status: 'warning',
        message: 'WP-CLI found but may not be working correctly',
        details: { error: result.stderr }
      };
    }

    return {
      status: 'healthy',
      message: 'WP-CLI is installed and working',
      details: {
        version: result.stdout.trim(),
        binary: wpCliBin
      }
    };
  }

  async _checkGitHubCli() {
    const ghBin = config.get('githubCliBin');
    const exists = await commandExecutor.commandExists(ghBin);
    
    if (!exists) {
      return {
        status: 'warning',
        message: `GitHub CLI not found at: ${ghBin}`,
        details: { binary: ghBin }
      };
    }

    const result = await commandExecutor.execute(ghBin, ['--version'], { timeout: 10000 });
    
    if (!result.success) {
      return {
        status: 'warning',
        message: 'GitHub CLI found but may not be working correctly',
        details: { error: result.stderr }
      };
    }

    // Check authentication status
    const authResult = await commandExecutor.execute(ghBin, ['auth', 'status'], { timeout: 10000 });
    const authenticated = authResult.success;

    return {
      status: authenticated ? 'healthy' : 'warning',
      message: authenticated 
        ? 'GitHub CLI is installed and authenticated' 
        : 'GitHub CLI is installed but not authenticated',
      details: {
        version: result.stdout.trim(),
        authenticated,
        binary: ghBin
      }
    };
  }

  async _checkUnzip() {
    const unzipBin = config.get('unzipBin');
    const exists = await commandExecutor.commandExists(unzipBin);
    
    if (!exists) {
      return {
        status: 'error',
        message: `unzip utility not found at: ${unzipBin}`,
        details: { binary: unzipBin }
      };
    }

    return {
      status: 'healthy',
      message: 'unzip utility is available',
      details: { binary: unzipBin }
    };
  }

  async _checkGit() {
    const exists = await commandExecutor.commandExists('git');
    
    if (!exists) {
      return {
        status: 'error',
        message: 'Git is not installed',
        details: {}
      };
    }

    const result = await commandExecutor.execute('git', ['--version'], { timeout: 5000 });
    
    return {
      status: 'healthy',
      message: 'Git is installed',
      details: {
        version: result.stdout ? result.stdout.trim() : 'unknown'
      }
    };
  }

  async _checkNetworkConnectivity() {
    try {
      // Test connectivity to Docker Hub and WordPress.org
      const tests = [
        { name: 'Docker Hub', url: 'https://index.docker.io/v1/', timeout: 10000 },
        { name: 'WordPress.org', url: 'https://wordpress.org/', timeout: 10000 },
        { name: 'GitHub API', url: 'https://api.github.com/', timeout: 10000 }
      ];

      const results = [];
      
      for (const test of tests) {
        try {
          const response = await fetch(test.url, { 
            timeout: test.timeout,
            method: 'HEAD'
          });
          results.push({
            name: test.name,
            status: response.ok ? 'ok' : 'failed',
            statusCode: response.status
          });
        } catch (error) {
          results.push({
            name: test.name,
            status: 'failed',
            error: error.message
          });
        }
      }

      const failedTests = results.filter(r => r.status === 'failed');
      
      if (failedTests.length === 0) {
        return {
          status: 'healthy',
          message: 'Network connectivity is good',
          details: { tests: results }
        };
      } else if (failedTests.length < results.length) {
        return {
          status: 'warning',
          message: `Some network tests failed (${failedTests.length}/${results.length})`,
          details: { tests: results, failed: failedTests }
        };
      } else {
        return {
          status: 'error',
          message: 'All network connectivity tests failed',
          details: { tests: results }
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: `Network check failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  async _checkFilesystem() {
    const projectsDir = config.getProjectsDir();
    
    try {
      // Check if projects directory exists or can be created
      await fs.ensureDir(projectsDir);
      
      // Test write permissions
      const testFile = `${projectsDir}/.health-check-${Date.now()}`;
      await fs.writeFile(testFile, 'test');
      await fs.remove(testFile);

      return {
        status: 'healthy',
        message: 'Filesystem access is working',
        details: {
          projectsDir,
          writable: true
        }
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Filesystem access issue: ${error.message}`,
        details: {
          projectsDir,
          error: error.message
        }
      };
    }
  }

  async _checkNodeVersion() {
    const result = await commandExecutor.execute('node', ['--version'], { timeout: 5000 });
    
    if (!result.success) {
      return {
        status: 'error',
        message: 'Node.js version check failed',
        details: {}
      };
    }

    const version = result.stdout.trim();
    const majorVersion = parseInt(version.replace('v', '').split('.')[0]);
    
    let status = 'healthy';
    let message = `Node.js ${version} is installed`;
    
    if (majorVersion < 18) {
      status = 'warning';
      message += ' (Consider upgrading to Node.js 18+)';
    }

    return {
      status,
      message,
      details: {
        version,
        majorVersion,
        recommended: majorVersion >= 18
      }
    };
  }

  // Project-specific checks

  async _checkProjectExists(project) {
    const projectPath = config.getProjectPath(project);
    const exists = await fs.pathExists(projectPath);
    
    return {
      status: exists ? 'healthy' : 'error',
      message: exists ? `Project ${project} exists` : `Project ${project} not found`,
      details: {
        project,
        path: projectPath,
        exists
      }
    };
  }

  async _checkProjectContainers(project) {
    const result = await commandExecutor.executeDocker([
      'compose', 'ps', '--format', 'json'
    ], {
      cwd: config.getProjectPath(project),
      timeout: 15000
    });

    if (!result.success) {
      return {
        status: 'error',
        message: 'Failed to check Docker containers',
        details: { error: result.stderr }
      };
    }

    try {
      const containers = result.stdout.trim() 
        ? result.stdout.trim().split('\n').map(line => JSON.parse(line))
        : [];

      const runningContainers = containers.filter(c => c.State === 'running');
      const totalContainers = containers.length;

      if (totalContainers === 0) {
        return {
          status: 'warning',
          message: 'No containers found for project',
          details: { containers: [] }
        };
      }

      if (runningContainers.length === totalContainers) {
        return {
          status: 'healthy',
          message: `All containers running (${runningContainers.length}/${totalContainers})`,
          details: { containers }
        };
      } else {
        return {
          status: 'warning',
          message: `Some containers not running (${runningContainers.length}/${totalContainers})`,
          details: { containers }
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to parse container status',
        details: { error: error.message, output: result.stdout }
      };
    }
  }

  async _checkWordPressHealth(project) {
    const containerName = await commandExecutor.getContainerName(project);
    const result = await commandExecutor.executeWpCli(project, 'core', ['is-installed'], {
      containerName,
      timeout: 30000
    });

    if (!result.success) {
      return {
        status: 'warning',
        message: 'WordPress not installed or not accessible',
        details: { 
          container: containerName,
          error: result.stderr 
        }
      };
    }

    // Get additional WordPress info
    const versionResult = await commandExecutor.executeWpCli(project, 'core', ['version'], {
      containerName,
      timeout: 10000
    });

    return {
      status: 'healthy',
      message: 'WordPress is installed and accessible',
      details: {
        container: containerName,
        version: versionResult.success ? versionResult.stdout.trim() : 'unknown'
      }
    };
  }

  async _checkDockerComposeFile(project) {
    const projectPath = config.getProjectPath(project);
    const composeFile = `${projectPath}/docker-compose.yml`;
    
    const exists = await fs.pathExists(composeFile);
    
    return {
      status: exists ? 'healthy' : 'warning',
      message: exists ? 'docker-compose.yml found' : 'docker-compose.yml not found',
      details: {
        path: composeFile,
        exists
      }
    };
  }

  /**
   * Generate summary of health check results
   */
  _generateSummary(results, executionTime) {
    const counts = {
      healthy: 0,
      warning: 0,
      error: 0,
      total: results.size
    };

    let overallStatus = 'healthy';

    for (const result of results.values()) {
      counts[result.status]++;
      
      if (result.status === 'error') {
        overallStatus = 'error';
      } else if (result.status === 'warning' && overallStatus === 'healthy') {
        overallStatus = 'warning';
      }
    }

    return {
      overallStatus,
      healthyCount: counts.healthy,
      warningCount: counts.warning,
      errorCount: counts.error,
      totalChecks: counts.total,
      executionTime
    };
  }

  /**
   * Format health check results for MCP response
   */
  formatHealthCheckResponse(healthResults) {
    const { summary, results } = healthResults;
    
    let text = `Health Check Results:\n`;
    text += `Overall Status: ${summary.overallStatus.toUpperCase()}\n`;
    text += `Checks: ${summary.healthyCount} healthy, ${summary.warningCount} warnings, ${summary.errorCount} errors\n`;
    text += `Execution Time: ${summary.executionTime}ms\n\n`;

    // Group results by status
    const grouped = {
      healthy: [],
      warning: [],
      error: []
    };

    for (const [name, result] of Object.entries(results)) {
      grouped[result.status].push({ name, ...result });
    }

    // Display results by status
    for (const [status, items] of Object.entries(grouped)) {
      if (items.length > 0) {
        text += `${status.toUpperCase()}:\n`;
        items.forEach(item => {
          text += `  ✓ ${item.name}: ${item.message}\n`;
        });
        text += '\n';
      }
    }

    return createJsonResponse(healthResults, text);
  }
}

// Export singleton instance
export const healthCheckManager = new HealthCheckManager();