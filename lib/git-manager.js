/**
 * Git Manager - Handles Git repository operations for WordPress projects
 * Refactored to use new utilities for improved reliability and logging
 * @version 2.0.0
 */

import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs-extra';
import { logger } from './logger.js';
import { config } from './config-manager.js';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createTextResponse 
} from './mcp-response.js';

export class GitManager {
  constructor() {
    // Use centralized configuration
  }

  async getGit(projectPath) {
    try {
      return simpleGit(projectPath);
    } catch (error) {
      logger.logError(error, {
        operation: 'git-initialize',
        projectPath
      });
      throw new Error(`Failed to initialize Git for path ${projectPath}: ${error.message}`);
    }
  }

  async getProjectPath(projectName) {
    return config.getProjectPath(projectName);
  }

  async initRepository(projectPath, remoteUrl = null) {
    const git = await this.getGit(projectPath);
    
    // Initialize git repository
    await git.init();
    
    // Add remote if provided
    if (remoteUrl) {
      await git.addRemote('origin', remoteUrl);
    }
    
    return true;
  }

  async getStatus(projectName) {
    try {
      const projectPath = await this.getProjectPath(projectName);
      
      if (!await fs.pathExists(projectPath)) {
        return createErrorResponse(`Project '${projectName}' does not exist`);
      }

      logger.debug('Getting Git status', { projectName, projectPath });

      const git = await this.getGit(projectPath);
      const status = await git.status();
      
      let statusText = `Git Status for ${projectName}:\n`;
      statusText += `Branch: ${status.current || 'Unknown'}\n`;
      statusText += `Clean: ${status.isClean()}\n`;
      statusText += `Behind: ${status.behind || 0} commits\n`;
      statusText += `Ahead: ${status.ahead || 0} commits\n`;
      
      if (status.modified.length > 0) {
        statusText += `\nModified files (${status.modified.length}):\n`;
        status.modified.forEach(file => {
          statusText += `  - ${file}\n`;
        });
      }
      
      if (status.not_added.length > 0) {
        statusText += `\nUntracked files (${status.not_added.length}):\n`;
        status.not_added.forEach(file => {
          statusText += `  - ${file}\n`;
        });
      }
      
      if (status.deleted.length > 0) {
        statusText += `\nDeleted files (${status.deleted.length}):\n`;
        status.deleted.forEach(file => {
          statusText += `  - ${file}\n`;
        });
      }

      if (status.conflicted.length > 0) {
        statusText += `\nConflicted files (${status.conflicted.length}):\n`;
        status.conflicted.forEach(file => {
          statusText += `  - ${file}\n`;
        });
      }

      logger.debug('Git status retrieved successfully', {
        projectName,
        isClean: status.isClean(),
        branch: status.current,
        modifiedCount: status.modified.length,
        untrackedCount: status.not_added.length
      });

      return createTextResponse(
        statusText,
        {
          projectName,
          branch: status.current,
          isClean: status.isClean(),
          modified: status.modified.length,
          untracked: status.not_added.length,
          deleted: status.deleted.length,
          conflicted: status.conflicted.length
        }
      );
    } catch (error) {
      logger.logError(error, {
        operation: 'git-get-status',
        projectName
      });
      return createErrorResponse(
        `Failed to get Git status for '${projectName}': ${error.message}`,
        { projectName }
      );
    }
  }

  async commit(projectName, message) {
    try {
      const projectPath = await this.getProjectPath(projectName);
      
      if (!await fs.pathExists(projectPath)) {
        return createErrorResponse(`Project '${projectName}' does not exist`);
      }

      if (!message || message.trim().length === 0) {
        return createErrorResponse('Commit message is required');
      }

      logger.info('Committing changes', { projectName, message });

      const git = await this.getGit(projectPath);
      
      // Check if there are any changes to commit
      const status = await git.status();
      if (status.isClean()) {
        return createSuccessResponse(
          `No changes to commit in project '${projectName}'`,
          { projectName, isClean: true }
        );
      }
      
      // Add all changes
      await git.add('.');
      
      // Commit with message
      const commitResult = await git.commit(message);
      
      logger.info('Changes committed successfully', {
        projectName,
        commit: commitResult.commit,
        changes: commitResult.summary.changes,
        insertions: commitResult.summary.insertions,
        deletions: commitResult.summary.deletions
      });
      
      return createSuccessResponse(
        `Committed changes to '${projectName}'`,
        {
          projectName,
          commit: commitResult.commit,
          summary: {
            changes: commitResult.summary.changes,
            insertions: commitResult.summary.insertions,
            deletions: commitResult.summary.deletions
          },
          message: message.trim()
        }
      );
    } catch (error) {
      logger.logError(error, {
        operation: 'git-commit',
        projectName,
        message
      });
      return createErrorResponse(
        `Failed to commit changes to '${projectName}': ${error.message}`,
        { projectName, message }
      );
    }
  }

  async commitAll(projectPath, message) {
    try {
      const git = await this.getGit(projectPath);
      await git.add('.');
      await git.commit(message);
      
      logger.debug('CommitAll completed', { projectPath, message });
    } catch (error) {
      logger.logError(error, {
        operation: 'git-commit-all',
        projectPath,
        message
      });
      throw error;
    }
  }

  async prepareDeployment(projectName) {
    const projectPath = path.join(this.projectsDir, projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project ${projectName} does not exist`);
    }

    const git = await this.getGit(projectPath);
    const status = await git.status();
    
    let checklist = `Deployment Preparation for ${projectName}\n`;
    checklist += `${'='.repeat(50)}\n\n`;
    
    // Check Git status
    checklist += `✅ Git Status:\n`;
    if (status.isClean()) {
      checklist += `   ✓ Working directory clean\n`;
    } else {
      checklist += `   ⚠️ Uncommitted changes detected!\n`;
      checklist += `   Run 'wp_git_commit' first\n`;
    }
    
    // Check for database dump
    const migrationsDir = path.join(projectPath, 'migrations');
    if (await fs.pathExists(migrationsDir)) {
      const migrations = await fs.readdir(migrationsDir);
      const sqlFiles = migrations.filter(f => f.endsWith('.sql'));
      checklist += `\n✅ Database Migrations:\n`;
      checklist += `   Found ${sqlFiles.length} migration file(s)\n`;
      if (sqlFiles.length === 0) {
        checklist += `   ⚠️ No database dumps found!\n`;
        checklist += `   Run 'wp_db_dump' to create a database export\n`;
      }
    }
    
    // Get remote info
    try {
      const remotes = await git.getRemotes(true);
      checklist += `\n✅ Git Remotes:\n`;
      if (remotes.length > 0) {
        remotes.forEach(remote => {
          checklist += `   ${remote.name}: ${remote.refs.push || remote.refs.fetch}\n`;
        });
      } else {
        checklist += `   ⚠️ No Git remote configured\n`;
        checklist += `   Add a remote repository before pushing\n`;
      }
    } catch (error) {
      checklist += `\n⚠️ Git Remotes: Error checking remotes\n`;
    }
    
    // Deployment checklist
    checklist += `\n📋 Manual Deployment Steps:\n`;
    checklist += `1. Ensure all changes are committed\n`;
    checklist += `2. Push to Git repository:\n`;
    checklist += `   git push origin main\n`;
    checklist += `3. On production server (SiteGround):\n`;
    checklist += `   - Pull latest changes from Git\n`;
    checklist += `   - Import database from migrations/\n`;
    checklist += `   - Update wp-config.php if needed\n`;
    checklist += `   - Clear cache\n`;
    
    // Create deployment tag
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const tagName = `deploy-${timestamp}`;
    
    if (status.isClean()) {
      await git.addTag(tagName);
      checklist += `\n✅ Created deployment tag: ${tagName}\n`;
    }

    return {
      content: [
        {
          type: 'text',
          text: checklist,
        },
      ],
    };
  }

  async push(projectName, remote = 'origin', branch = 'main') {
    const projectPath = path.join(this.projectsDir, projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project ${projectName} does not exist`);
    }

    const git = await this.getGit(projectPath);
    
    try {
      await git.push(remote, branch);
      return {
        content: [
          {
            type: 'text',
            text: `Pushed ${projectName} to ${remote}/${branch}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to push: ${error.message}`);
    }
  }

  async pull(projectName, remote = 'origin', branch = 'main') {
    const projectPath = path.join(this.projectsDir, projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project ${projectName} does not exist`);
    }

    const git = await this.getGit(projectPath);
    
    try {
      const result = await git.pull(remote, branch);
      return {
        content: [
          {
            type: 'text',
            text: `Pulled updates for ${projectName}:\n` +
                  `Files changed: ${result.summary.changes}\n` +
                  `Insertions: ${result.summary.insertions}\n` +
                  `Deletions: ${result.summary.deletions}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to pull: ${error.message}`);
    }
  }

  async addSiteGroundRemote(projectName, sshHost, sshUser, repoPath) {
    const projectPath = path.join(this.projectsDir, projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project ${projectName} does not exist`);
    }

    const git = await this.getGit(projectPath);
    const sitegroundRemote = `ssh://${sshUser}@${sshHost}:18765/~/git/${repoPath}`;
    
    try {
      const remotes = await git.getRemotes(true);
      
      // Remove existing siteground remote if it exists
      if (remotes.some(r => r.name === 'siteground')) {
        await git.removeRemote('siteground');
      }
      
      // Add SiteGround remote with proper SSH port
      await git.addRemote('siteground', sitegroundRemote);
      
      return {
        content: [
          {
            type: 'text',
            text: `Added SiteGround remote for ${projectName}:\n` +
                  `Remote URL: ${sitegroundRemote}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to add SiteGround remote: ${error.message}`);
    }
  }

  async listRemotes(projectName) {
    const projectPath = path.join(this.projectsDir, projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project ${projectName} does not exist`);
    }

    const git = await this.getGit(projectPath);
    
    try {
      const remotes = await git.getRemotes(true);
      
      let remotesText = `Git remotes for ${projectName}:\n`;
      if (remotes.length === 0) {
        remotesText += 'No remotes configured';
      } else {
        remotes.forEach(remote => {
          remotesText += `\n${remote.name}:\n`;
          remotesText += `  Fetch: ${remote.refs.fetch}\n`;
          if (remote.refs.push) {
            remotesText += `  Push: ${remote.refs.push}\n`;
          }
        });
      }
      
      return {
        content: [
          {
            type: 'text',
            text: remotesText,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to list remotes: ${error.message}`);
    }
  }
}