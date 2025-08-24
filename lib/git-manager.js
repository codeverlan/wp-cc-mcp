import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs-extra';

export class GitManager {
  constructor() {
    this.projectsDir = '/home/thornlcsw/wp-projects';
  }

  async getGit(projectPath) {
    return simpleGit(projectPath);
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
    const projectPath = path.join(this.projectsDir, projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project ${projectName} does not exist`);
    }

    const git = await this.getGit(projectPath);
    const status = await git.status();
    
    let statusText = `Git Status for ${projectName}:\n`;
    statusText += `Branch: ${status.current}\n`;
    statusText += `Clean: ${status.isClean()}\n`;
    
    if (status.modified.length > 0) {
      statusText += `\nModified files:\n`;
      status.modified.forEach(file => {
        statusText += `  - ${file}\n`;
      });
    }
    
    if (status.not_added.length > 0) {
      statusText += `\nUntracked files:\n`;
      status.not_added.forEach(file => {
        statusText += `  - ${file}\n`;
      });
    }
    
    if (status.deleted.length > 0) {
      statusText += `\nDeleted files:\n`;
      status.deleted.forEach(file => {
        statusText += `  - ${file}\n`;
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: statusText,
        },
      ],
    };
  }

  async commit(projectName, message) {
    const projectPath = path.join(this.projectsDir, projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project ${projectName} does not exist`);
    }

    const git = await this.getGit(projectPath);
    
    // Add all changes
    await git.add('.');
    
    // Commit with message
    const commitResult = await git.commit(message);
    
    return {
      content: [
        {
          type: 'text',
          text: `Committed changes to ${projectName}:\n` +
                `Commit: ${commitResult.commit}\n` +
                `Files changed: ${commitResult.summary.changes}\n` +
                `Insertions: ${commitResult.summary.insertions}\n` +
                `Deletions: ${commitResult.summary.deletions}`,
        },
      ],
    };
  }

  async commitAll(projectPath, message) {
    const git = await this.getGit(projectPath);
    await git.add('.');
    await git.commit(message);
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
}