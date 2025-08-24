import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs-extra';
import { execa } from 'execa';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class SiteGroundManager {
  constructor() {
    this.projectsDir = '/home/thornlcsw/wp-projects';
    this.dbPath = path.join(path.dirname(__dirname), 'projects.db');
    this.initDatabase();
  }

  initDatabase() {
    this.db = new Database(this.dbPath);
    
    // Add SiteGround-specific columns to projects table if they don't exist
    try {
      this.db.exec(`
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS siteground_ssh_host TEXT;
      `);
    } catch (e) {
      // Column might already exist
    }
    
    try {
      this.db.exec(`
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS siteground_ssh_user TEXT;
      `);
    } catch (e) {
      // Column might already exist
    }
    
    try {
      this.db.exec(`
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS siteground_repo_path TEXT;
      `);
    } catch (e) {
      // Column might already exist
    }
    
    try {
      this.db.exec(`
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS siteground_site_url TEXT;
      `);
    } catch (e) {
      // Column might already exist
    }
    
    try {
      this.db.exec(`
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS siteground_deployment_branch TEXT DEFAULT 'master';
      `);
    } catch (e) {
      // Column might already exist
    }
    
    try {
      this.db.exec(`
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS siteground_staging_branch TEXT DEFAULT 'staging';
      `);
    } catch (e) {
      // Column might already exist
    }
  }

  async connectProject(projectName, sshHost, sshUser, repoPath, siteUrl = null) {
    const project = this.db.prepare('SELECT * FROM projects WHERE name = ?').get(projectName);
    
    if (!project) {
      throw new Error(`Project ${projectName} does not exist`);
    }

    const projectPath = path.join(this.projectsDir, projectName);
    
    // Update database with SiteGround connection info
    this.db.prepare(`
      UPDATE projects 
      SET siteground_ssh_host = ?, 
          siteground_ssh_user = ?, 
          siteground_repo_path = ?,
          siteground_site_url = ?
      WHERE name = ?
    `).run(sshHost, sshUser, repoPath, siteUrl, projectName);

    // Set up SiteGround as a remote
    const git = simpleGit(projectPath);
    const sitegroundRemote = `ssh://${sshUser}@${sshHost}:18765/~/git/${repoPath}`;
    
    try {
      // Check if siteground remote already exists
      const remotes = await git.getRemotes(true);
      const hasRemote = remotes.some(r => r.name === 'siteground');
      
      if (hasRemote) {
        // Update existing remote
        await git.removeRemote('siteground');
      }
      
      // Add SiteGround remote
      await git.addRemote('siteground', sitegroundRemote);
      
      // Also add production and staging remotes for convenience
      if (!remotes.some(r => r.name === 'production')) {
        await git.addRemote('production', sitegroundRemote);
      }
      
      if (!remotes.some(r => r.name === 'staging')) {
        await git.addRemote('staging', sitegroundRemote);
      }
      
    } catch (error) {
      throw new Error(`Failed to configure SiteGround remote: ${error.message}`);
    }

    // Create SiteGround-specific .gitignore if it doesn't exist
    await this.createSiteGroundGitIgnore(projectPath);

    return {
      content: [
        {
          type: 'text',
          text: `Connected ${projectName} to SiteGround:\n` +
                `SSH Host: ${sshHost}\n` +
                `SSH User: ${sshUser}\n` +
                `Repository: ${repoPath}\n` +
                `Site URL: ${siteUrl || 'Not specified'}\n` +
                `Remote URL: ${sitegroundRemote}\n\n` +
                `You can now deploy using: wp_siteground_deploy`,
        },
      ],
    };
  }

  async createSiteGroundGitIgnore(projectPath) {
    const gitignorePath = path.join(projectPath, '.gitignore');
    
    const sitegroundGitignore = `# WordPress Core (managed by SiteGround)
/wp-admin/
/wp-includes/
/index.php
/license.txt
/readme.html
/wp-*.php
!/wp-config.php
xmlrpc.php

# WordPress Content
/wp-content/uploads/
/wp-content/upgrade/
/wp-content/backup-db/
/wp-content/backups/
/wp-content/blogs.dir/
/wp-content/cache/
/wp-content/w3tc-config/
/wp-content/wp-cache-config.php

# WordPress Plugins (uncomment if you want to manage plugins via Git)
# /wp-content/plugins/

# WordPress Themes (keep themes in Git)
!/wp-content/themes/

# SiteGround specific
/wp-content/sg-optimizer-cache/
/wp-content/siteground-optimizer-assets/

# Database dumps
*.sql
*.sql.gz
/migrations/

# Log files
*.log
error_log

# OS files
.DS_Store
Thumbs.db

# Editor files
*.swp
*.swo
*~
.idea/
.vscode/

# Environment files
.env
.env.*
wp-config-local.php

# Node
node_modules/
npm-debug.log
yarn-error.log

# Composer
vendor/
composer.lock
`;

    // Only create if it doesn't exist, otherwise append SiteGround-specific rules
    if (!await fs.pathExists(gitignorePath)) {
      await fs.writeFile(gitignorePath, sitegroundGitignore);
    }
  }

  async deploy(projectName, options = {}) {
    const {
      branch = 'master',
      clearCache = true,
      skipDatabaseDump = false,
      message = null
    } = options;

    const project = this.db.prepare(`
      SELECT * FROM projects WHERE name = ?
    `).get(projectName);
    
    if (!project) {
      throw new Error(`Project ${projectName} does not exist`);
    }

    if (!project.siteground_ssh_host) {
      throw new Error(`Project ${projectName} is not connected to SiteGround. Run wp_siteground_connect first.`);
    }

    const projectPath = path.join(this.projectsDir, projectName);
    const git = simpleGit(projectPath);
    
    let deploymentLog = `Deploying ${projectName} to SiteGround\n`;
    deploymentLog += `${'='.repeat(50)}\n\n`;

    try {
      // Step 1: Check git status
      const status = await git.status();
      
      if (!status.isClean()) {
        // Auto-commit changes if there are any
        await git.add('.');
        const commitMessage = message || `Auto-commit before SiteGround deployment - ${new Date().toISOString()}`;
        await git.commit(commitMessage);
        deploymentLog += `✅ Committed local changes: "${commitMessage}"\n`;
      } else {
        deploymentLog += `✅ Working directory clean\n`;
      }

      // Step 2: Database dump (unless skipped)
      if (!skipDatabaseDump) {
        try {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const dumpFile = path.join(projectPath, 'migrations', `pre-deploy-${timestamp}.sql`);
          
          // Export database using Docker
          await execa('docker', [
            'exec',
            `${projectName}-db`,
            'mysqldump',
            '-u', 'wordpress',
            '-pwordpress',
            'wordpress'
          ], {
            stdout: fs.createWriteStream(dumpFile),
          });
          
          deploymentLog += `✅ Database dumped to migrations/pre-deploy-${timestamp}.sql\n`;
          
          // Commit the database dump
          await git.add(dumpFile);
          await git.commit(`Database dump before deployment - ${timestamp}`);
        } catch (dbError) {
          deploymentLog += `⚠️ Database dump failed (continuing): ${dbError.message}\n`;
        }
      }

      // Step 3: Push to SiteGround
      deploymentLog += `\n📤 Pushing to SiteGround (branch: ${branch})...\n`;
      
      try {
        const pushResult = await git.push('siteground', branch, ['--force-with-lease']);
        deploymentLog += `✅ Successfully pushed to SiteGround\n`;
      } catch (pushError) {
        // Try without force-with-lease if it fails
        const pushResult = await git.push('siteground', branch);
        deploymentLog += `✅ Successfully pushed to SiteGround\n`;
      }

      // Step 4: Clear SiteGround cache if requested
      if (clearCache && project.siteground_ssh_host && project.siteground_ssh_user) {
        deploymentLog += `\n🧹 Clearing SiteGround cache...\n`;
        
        try {
          // SSH into SiteGround and run WP-CLI cache clear
          const sshCommand = [
            '-p', '18765',
            `${project.siteground_ssh_user}@${project.siteground_ssh_host}`,
            'cd ~/public_html && wp sg purge'
          ];
          
          await execa('ssh', sshCommand);
          deploymentLog += `✅ SiteGround cache cleared\n`;
        } catch (cacheError) {
          deploymentLog += `⚠️ Cache clear failed (site may need manual cache clear): ${cacheError.message}\n`;
        }
      }

      // Step 5: Create deployment tag
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const tagName = `siteground-deploy-${timestamp}`;
      await git.addTag(tagName);
      deploymentLog += `\n✅ Created deployment tag: ${tagName}\n`;

      // Step 6: Verification steps
      deploymentLog += `\n📋 Post-Deployment Checklist:\n`;
      deploymentLog += `1. ✅ Code pushed to SiteGround\n`;
      
      if (clearCache) {
        deploymentLog += `2. ✅ Cache cleared (or attempted)\n`;
      }
      
      if (project.siteground_site_url) {
        deploymentLog += `3. 🔗 Check site: ${project.siteground_site_url}\n`;
      }
      
      deploymentLog += `4. 📝 If database changes were made:\n`;
      deploymentLog += `   - SSH to SiteGround: ssh -p 18765 ${project.siteground_ssh_user}@${project.siteground_ssh_host}\n`;
      deploymentLog += `   - Import database: wp db import migrations/[latest].sql\n`;
      deploymentLog += `5. 🔄 Monitor site for any issues\n`;

    } catch (error) {
      throw new Error(`Deployment failed: ${error.message}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: deploymentLog,
        },
      ],
    };
  }

  async sync(projectName, options = {}) {
    const { branch = 'master' } = options;

    const project = this.db.prepare(`
      SELECT * FROM projects WHERE name = ?
    `).get(projectName);
    
    if (!project) {
      throw new Error(`Project ${projectName} does not exist`);
    }

    if (!project.siteground_ssh_host) {
      throw new Error(`Project ${projectName} is not connected to SiteGround. Run wp_siteground_connect first.`);
    }

    const projectPath = path.join(this.projectsDir, projectName);
    const git = simpleGit(projectPath);
    
    try {
      // Check for uncommitted changes
      const status = await git.status();
      
      if (!status.isClean()) {
        throw new Error('You have uncommitted changes. Please commit or stash them before syncing.');
      }

      // Pull from SiteGround
      const pullResult = await git.pull('siteground', branch);
      
      let syncLog = `Synced ${projectName} from SiteGround\n`;
      syncLog += `Branch: ${branch}\n`;
      syncLog += `Files changed: ${pullResult.summary.changes}\n`;
      syncLog += `Insertions: ${pullResult.summary.insertions}\n`;
      syncLog += `Deletions: ${pullResult.summary.deletions}\n`;
      
      if (pullResult.files && pullResult.files.length > 0) {
        syncLog += `\nModified files:\n`;
        pullResult.files.forEach(file => {
          syncLog += `  - ${file}\n`;
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: syncLog,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Sync failed: ${error.message}`);
    }
  }

  async clearCache(projectName) {
    const project = this.db.prepare(`
      SELECT * FROM projects WHERE name = ?
    `).get(projectName);
    
    if (!project) {
      throw new Error(`Project ${projectName} does not exist`);
    }

    if (!project.siteground_ssh_host || !project.siteground_ssh_user) {
      throw new Error(`Project ${projectName} is not connected to SiteGround. Run wp_siteground_connect first.`);
    }

    try {
      // SSH into SiteGround and run cache clear commands
      const sshCommand = [
        '-p', '18765',
        `${project.siteground_ssh_user}@${project.siteground_ssh_host}`,
        'cd ~/public_html && wp sg purge && wp cache flush'
      ];
      
      const result = await execa('ssh', sshCommand);
      
      return {
        content: [
          {
            type: 'text',
            text: `SiteGround cache cleared for ${projectName}\n` +
                  `Site: ${project.siteground_site_url || project.siteground_ssh_host}\n` +
                  result.stdout || 'Cache cleared successfully',
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to clear cache: ${error.message}`);
    }
  }

  async getDeploymentInfo(projectName) {
    const project = this.db.prepare(`
      SELECT * FROM projects WHERE name = ?
    `).get(projectName);
    
    if (!project) {
      throw new Error(`Project ${projectName} does not exist`);
    }

    let info = `SiteGround Deployment Info for ${projectName}\n`;
    info += `${'='.repeat(50)}\n\n`;

    if (!project.siteground_ssh_host) {
      info += `⚠️ Not connected to SiteGround\n`;
      info += `Run wp_siteground_connect to set up connection\n`;
    } else {
      info += `✅ Connected to SiteGround\n`;
      info += `SSH Host: ${project.siteground_ssh_host}\n`;
      info += `SSH User: ${project.siteground_ssh_user}\n`;
      info += `SSH Port: 18765\n`;
      info += `Repository: ${project.siteground_repo_path}\n`;
      info += `Site URL: ${project.siteground_site_url || 'Not specified'}\n`;
      info += `Deployment Branch: ${project.siteground_deployment_branch || 'master'}\n`;
      info += `Staging Branch: ${project.siteground_staging_branch || 'staging'}\n`;
      
      info += `\n📝 SSH Command:\n`;
      info += `ssh -p 18765 ${project.siteground_ssh_user}@${project.siteground_ssh_host}\n`;
      
      info += `\n🚀 Deployment Commands:\n`;
      info += `wp_siteground_deploy("${projectName}")\n`;
      info += `wp_siteground_sync("${projectName}")\n`;
      info += `wp_siteground_cache_clear("${projectName}")\n`;
    }

    return {
      content: [
        {
          type: 'text',
          text: info,
        },
      ],
    };
  }
}