/**
 * Docker Manager - Manages Docker containers and compose operations
 * Refactored to use new utilities for improved reliability and logging
 * @version 2.0.0
 */

import path from 'path';
import fs from 'fs-extra';
import { logger } from './logger.js';
import { config } from './config-manager.js';
import { commandExecutor } from './command-executor.js';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createCommandResponse 
} from './mcp-response.js';

export class DockerManager {
  constructor() {
    this.composeCommand = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    await this.detectComposeCommand();
    this.isInitialized = true;
  }

  async detectComposeCommand() {
    try {
      // Try docker compose first (newer version)
      await commandExecutor.execute(['docker', 'compose', 'version'], {
        timeout: 5000,
        description: 'Check docker compose version'
      });
      this.composeCommand = ['docker', 'compose'];
      logger.debug('Using docker compose command');
    } catch (error) {
      try {
        // Fall back to docker-compose (legacy)
        await commandExecutor.execute(['docker-compose', '--version'], {
          timeout: 5000,
          description: 'Check docker-compose version'
        });
        this.composeCommand = ['docker-compose'];
        logger.debug('Using docker-compose command');
      } catch (legacyError) {
        throw new Error('Docker Compose is not installed or not accessible');
      }
    }
  }

  async getProjectPath(projectName) {
    return config.getProjectPath(projectName);
  }

  async checkDockerInstalled() {
    try {
      await this.initialize();
      
      // Verify Docker daemon is running
      await commandExecutor.execute(['docker', 'info'], {
        timeout: 10000,
        description: 'Check Docker daemon status'
      });
      
      return true;
    } catch (error) {
      logger.logError(error, {
        operation: 'docker-health-check'
      });
      throw new Error(`Docker is not available: ${error.message}`);
    }
  }

  async startProject(projectName) {
    try {
      await this.checkDockerInstalled();
      const projectPath = await this.getProjectPath(projectName);
      
      if (!await fs.pathExists(projectPath)) {
        return createErrorResponse(`Project '${projectName}' does not exist`);
      }

      logger.info('Starting Docker containers', { projectName });

      const result = await commandExecutor.execute(
        [...this.composeCommand, 'up', '-d'], 
        {
          cwd: projectPath,
          timeout: 120000, // 2 minutes
          description: `Start containers for ${projectName}`
        }
      );

      if (result.success) {
        logger.info('Docker containers started successfully', {
          projectName,
          executionTime: result.executionTime
        });
        
        return createSuccessResponse(
          `Started containers for project '${projectName}'`,
          { 
            projectName, 
            output: result.stdout,
            executionTime: result.executionTime 
          }
        );
      } else {
        return createErrorResponse(
          `Failed to start project '${projectName}': ${result.stderr}`,
          { projectName, error: result.stderr }
        );
      }
    } catch (error) {
      logger.logError(error, {
        operation: 'docker-start-project',
        projectName
      });
      return createErrorResponse(
        `Failed to start project '${projectName}': ${error.message}`,
        { projectName }
      );
    }
  }

  async stopProject(projectName) {
    try {
      await this.checkDockerInstalled();
      const projectPath = await this.getProjectPath(projectName);
      
      if (!await fs.pathExists(projectPath)) {
        return createErrorResponse(`Project '${projectName}' does not exist`);
      }

      logger.info('Stopping Docker containers', { projectName });

      const result = await commandExecutor.execute(
        [...this.composeCommand, 'down'],
        {
          cwd: projectPath,
          timeout: 60000,
          description: `Stop containers for ${projectName}`
        }
      );

      if (result.success) {
        logger.info('Docker containers stopped successfully', {
          projectName,
          executionTime: result.executionTime
        });
        
        return createSuccessResponse(
          `Stopped containers for project '${projectName}'`,
          { 
            projectName, 
            output: result.stdout,
            executionTime: result.executionTime 
          }
        );
      } else {
        return createErrorResponse(
          `Failed to stop project '${projectName}': ${result.stderr}`,
          { projectName, error: result.stderr }
        );
      }
    } catch (error) {
      logger.logError(error, {
        operation: 'docker-stop-project',
        projectName
      });
      return createErrorResponse(
        `Failed to stop project '${projectName}': ${error.message}`,
        { projectName }
      );
    }
  }

  async restartProject(projectName) {
    await this.checkDockerInstalled();
    const projectPath = await this.getProjectPath(projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project ${projectName} does not exist`);
    }

    try {
      const command = this.composeCommand || ['docker', 'compose'];
      await execa(command[0], [...command.slice(1), 'restart'], {
        cwd: projectPath,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Restarted containers for project: ${projectName}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to restart project: ${error.message}`);
    }
  }

  async getLogs(projectName, service = null, lines = 50) {
    await this.checkDockerInstalled();
    const projectPath = await this.getProjectPath(projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project ${projectName} does not exist`);
    }

    try {
      const args = ['logs', '--tail', lines.toString()];
      if (service) {
        args.push(service);
      }

      const command = this.composeCommand || ['docker', 'compose'];
      const { stdout } = await execa(command[0], [...command.slice(1), ...args], {
        cwd: projectPath,
      });

      return {
        content: [
          {
            type: 'text',
            text: stdout || 'No logs available',
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get logs: ${error.message}`);
    }
  }

  async getContainerStatus(projectName) {
    try {
      await this.checkDockerInstalled();
      const projectPath = await this.getProjectPath(projectName);
      
      if (!await fs.pathExists(projectPath)) {
        return 'not_found';
      }

      const result = await commandExecutor.execute(
        [...this.composeCommand, 'ps', '--format', 'json'],
        {
          cwd: projectPath,
          timeout: 10000,
          description: `Get container status for ${projectName}`
        }
      );

      if (result.success) {
        const output = result.stdout.trim();
        if (!output) {
          return 'stopped';
        }
        
        // Parse JSON output to get precise status
        try {
          const containers = output.split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line));
          
          const runningContainers = containers.filter(c => c.State === 'running');
          const totalContainers = containers.length;
          
          if (runningContainers.length === totalContainers && totalContainers > 0) {
            return 'running';
          } else if (runningContainers.length > 0) {
            return 'partial';
          } else {
            return 'stopped';
          }
        } catch (parseError) {
          // Fallback to string matching
          return output.includes('Up') ? 'running' : 'stopped';
        }
      } else {
        return 'error';
      }
    } catch (error) {
      logger.logError(error, {
        operation: 'docker-get-status',
        projectName
      });
      return 'error';
    }
  }

  async createDockerNetwork(projectName) {
    try {
      await commandExecutor.execute(
        ['docker', 'network', 'create', `wp-${projectName}-network`],
        {
          timeout: 30000,
          description: `Create Docker network for ${projectName}`
        }
      );
      logger.debug('Docker network created', { projectName });
    } catch (error) {
      // Network might already exist, which is fine
      if (!error.message.includes('already exists')) {
        logger.logError(error, {
          operation: 'docker-create-network',
          projectName
        });
        throw error;
      }
    }
  }

  async removeDockerNetwork(projectName) {
    try {
      await commandExecutor.execute(
        ['docker', 'network', 'rm', `wp-${projectName}-network`],
        {
          timeout: 30000,
          description: `Remove Docker network for ${projectName}`
        }
      );
      logger.debug('Docker network removed', { projectName });
    } catch (error) {
      // Network might not exist or be in use, which is fine for cleanup
      logger.debug('Network removal failed (expected during cleanup)', {
        projectName,
        error: error.message
      });
    }
  }

  async removeContainers(projectName) {
    const projectPath = await this.getProjectPath(projectName);
    
    if (await fs.pathExists(projectPath)) {
      try {
        await commandExecutor.execute(
          [...this.composeCommand, 'down', '-v'],
          {
            cwd: projectPath,
            timeout: 60000,
            description: `Remove containers and volumes for ${projectName}`
          }
        );
        logger.debug('Docker containers and volumes removed', { projectName });
      } catch (error) {
        // Containers might not exist, which is fine for cleanup
        logger.debug('Container removal failed (expected during cleanup)', {
          projectName,
          error: error.message
        });
      }
    }
  }

  // Add missing methods that were referenced elsewhere
  async restartProject(projectName) {
    try {
      await this.checkDockerInstalled();
      const projectPath = await this.getProjectPath(projectName);
      
      if (!await fs.pathExists(projectPath)) {
        return createErrorResponse(`Project '${projectName}' does not exist`);
      }

      logger.info('Restarting Docker containers', { projectName });

      const result = await commandExecutor.execute(
        [...this.composeCommand, 'restart'],
        {
          cwd: projectPath,
          timeout: 120000,
          description: `Restart containers for ${projectName}`
        }
      );

      if (result.success) {
        logger.info('Docker containers restarted successfully', {
          projectName,
          executionTime: result.executionTime
        });
        
        return createSuccessResponse(
          `Restarted containers for project '${projectName}'`,
          { 
            projectName, 
            executionTime: result.executionTime 
          }
        );
      } else {
        return createErrorResponse(
          `Failed to restart project '${projectName}': ${result.stderr}`,
          { projectName, error: result.stderr }
        );
      }
    } catch (error) {
      logger.logError(error, {
        operation: 'docker-restart-project',
        projectName
      });
      return createErrorResponse(
        `Failed to restart project '${projectName}': ${error.message}`,
        { projectName }
      );
    }
  }

  async getLogs(projectName, service = null, lines = 50) {
    try {
      await this.checkDockerInstalled();
      const projectPath = await this.getProjectPath(projectName);
      
      if (!await fs.pathExists(projectPath)) {
        return createErrorResponse(`Project '${projectName}' does not exist`);
      }

      const args = [...this.composeCommand, 'logs', '--tail', lines.toString()];
      if (service) {
        args.push(service);
      }

      const result = await commandExecutor.execute(args, {
        cwd: projectPath,
        timeout: 30000,
        description: `Get logs for ${projectName}${service ? ` (${service})` : ''}`
      });

      if (result.success) {
        return createSuccessResponse(
          `Logs retrieved for project '${projectName}'${service ? ` (${service})` : ''}`,
          {
            projectName,
            service,
            logs: result.stdout || 'No logs available',
            lines
          }
        );
      } else {
        return createErrorResponse(
          `Failed to get logs for '${projectName}': ${result.stderr}`,
          { projectName, service }
        );
      }
    } catch (error) {
      logger.logError(error, {
        operation: 'docker-get-logs',
        projectName,
        service
      });
      return createErrorResponse(
        `Failed to get logs for '${projectName}': ${error.message}`,
        { projectName, service }
      );
    }
  }
}