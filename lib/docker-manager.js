import { execa } from 'execa';
import path from 'path';
import fs from 'fs-extra';

export class DockerManager {
  constructor() {
    this.projectsDir = '/home/thornlcsw/docker/wp-projects';
  }

  async getProjectPath(projectName) {
    return path.join(this.projectsDir, projectName);
  }

  async checkDockerInstalled() {
    try {
      // Check Docker
      await execa('docker', ['--version']);
      
      // Check for either docker-compose or docker compose command
      try {
        await execa('docker', ['compose', 'version']);
        this.composeCommand = ['docker', 'compose'];
      } catch {
        await execa('docker-compose', ['--version']);
        this.composeCommand = ['docker-compose'];
      }
      
      return true;
    } catch (error) {
      throw new Error('Docker or Docker Compose is not installed');
    }
  }

  async startProject(projectName) {
    await this.checkDockerInstalled();
    const projectPath = await this.getProjectPath(projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project ${projectName} does not exist`);
    }

    try {
      const command = this.composeCommand || ['docker', 'compose'];
      const { stdout, stderr } = await execa(command[0], [...command.slice(1), 'up', '-d'], {
        cwd: projectPath,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Started containers for project: ${projectName}\n${stdout}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to start project: ${error.message}`);
    }
  }

  async stopProject(projectName) {
    await this.checkDockerInstalled();
    const projectPath = await this.getProjectPath(projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project ${projectName} does not exist`);
    }

    try {
      const command = this.composeCommand || ['docker', 'compose'];
      const { stdout } = await execa(command[0], [...command.slice(1), 'down'], {
        cwd: projectPath,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Stopped containers for project: ${projectName}\n${stdout}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to stop project: ${error.message}`);
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
    await this.checkDockerInstalled();
    const projectPath = await this.getProjectPath(projectName);
    
    if (!await fs.pathExists(projectPath)) {
      return 'not_found';
    }

    try {
      const command = this.composeCommand || ['docker', 'compose'];
      const { stdout } = await execa(command[0], [...command.slice(1), 'ps', '-q'], {
        cwd: projectPath,
      });

      if (stdout.trim()) {
        // Check if containers are actually running
        const { stdout: psOutput } = await execa(command[0], [...command.slice(1), 'ps'], {
          cwd: projectPath,
        });
        
        if (psOutput.includes('Up')) {
          return 'running';
        } else {
          return 'stopped';
        }
      } else {
        return 'stopped';
      }
    } catch (error) {
      return 'error';
    }
  }

  async createDockerNetwork(projectName) {
    try {
      await execa('docker', ['network', 'create', `wp-${projectName}-network`]);
    } catch (error) {
      // Network might already exist, which is fine
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
  }

  async removeDockerNetwork(projectName) {
    try {
      await execa('docker', ['network', 'rm', `wp-${projectName}-network`]);
    } catch (error) {
      // Network might not exist or be in use, which is fine for cleanup
    }
  }

  async removeContainers(projectName) {
    const projectPath = await this.getProjectPath(projectName);
    
    if (await fs.pathExists(projectPath)) {
      try {
        const command = this.composeCommand || ['docker', 'compose'];
        await execa(command[0], [...command.slice(1), 'down', '-v'], {
          cwd: projectPath,
        });
      } catch (error) {
        // Containers might not exist, which is fine for cleanup
      }
    }
  }
}