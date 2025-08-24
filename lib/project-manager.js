import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';
import { execa } from 'execa';
import { DockerManager } from './docker-manager.js';
import { GitManager } from './git-manager.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class ProjectManager {
  constructor() {
    this.projectsDir = '/home/thornlcsw/wp-projects';
    this.dbPath = path.join(path.dirname(__dirname), 'projects.db');
    this.dockerManager = new DockerManager();
    this.initDatabase();
  }

  initDatabase() {
    this.db = new Database(this.dbPath);
    
    // Create projects table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        path TEXT NOT NULL,
        port INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
        git_remote TEXT,
        active BOOLEAN DEFAULT 0
      )
    `);

    // Create migrations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        checksum TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id)
      )
    `);
  }

  async createProject(name, port, gitRemote = null) {
    // Validate project name
    if (!/^[a-z0-9-]+$/.test(name)) {
      throw new Error('Project name must contain only lowercase letters, numbers, and hyphens');
    }

    // Check if project already exists
    const existing = this.db.prepare('SELECT * FROM projects WHERE name = ?').get(name);
    if (existing) {
      throw new Error(`Project ${name} already exists`);
    }

    // Check if port is already in use
    const portInUse = this.db.prepare('SELECT * FROM projects WHERE port = ?').get(port);
    if (portInUse) {
      throw new Error(`Port ${port} is already in use by project ${portInUse.name}`);
    }

    const projectPath = path.join(this.projectsDir, name);

    try {
      // Create project directory
      await fs.ensureDir(projectPath);

      // Download WordPress
      const wpUrl = 'https://wordpress.org/wordpress-6.8.1.tar.gz';
      const wpArchive = path.join('/tmp', `wordpress-${name}.tar.gz`);
      
      await execa('wget', ['-O', wpArchive, wpUrl]);
      await execa('tar', ['-xzf', wpArchive, '-C', projectPath, '--strip-components=1'], {
        cwd: projectPath,
      });
      await fs.remove(wpArchive);

      // Create migrations directory
      await fs.ensureDir(path.join(projectPath, 'migrations'));

      // Copy Docker templates
      await this.createDockerFiles(projectPath, name, port);

      // Copy WordPress config template
      await this.createWordPressConfig(projectPath);

      // Create .gitignore
      await this.createGitIgnore(projectPath);

      // Initialize Git repository
      const gitManager = new GitManager();
      await gitManager.initRepository(projectPath, gitRemote);

      // Insert into database
      this.db.prepare(`
        INSERT INTO projects (name, path, port, git_remote, active)
        VALUES (?, ?, ?, ?, ?)
      `).run(name, projectPath, port, gitRemote, 0);

      // Start Docker containers
      await this.dockerManager.startProject(name);

      // Wait for WordPress to be ready
      await this.waitForWordPress(port);

      // Make initial commit
      await gitManager.commitAll(projectPath, 'Initial WordPress setup');

      return {
        content: [
          {
            type: 'text',
            text: `✅ Created WordPress project: ${name}\n` +
                  `📁 Location: ${projectPath}\n` +
                  `🌐 URL: http://localhost:${port}\n` +
                  `🐳 Docker containers started\n` +
                  `📝 Git repository initialized`,
          },
        ],
      };
    } catch (error) {
      // Cleanup on failure
      await fs.remove(projectPath);
      this.db.prepare('DELETE FROM projects WHERE name = ?').run(name);
      throw new Error(`Failed to create project: ${error.message}`);
    }
  }

  async listProjects() {
    const projects = this.db.prepare('SELECT * FROM projects ORDER BY last_accessed DESC').all();
    
    // Check container status for each project
    for (const project of projects) {
      project.status = await this.dockerManager.getContainerStatus(project.name);
    }

    const projectList = projects.map(p => 
      `• ${p.name} (Port: ${p.port}) - Status: ${p.status}${p.active ? ' [ACTIVE]' : ''}`
    ).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: projectList || 'No projects found',
        },
      ],
    };
  }

  async switchProject(name) {
    const project = this.db.prepare('SELECT * FROM projects WHERE name = ?').get(name);
    if (!project) {
      throw new Error(`Project ${name} not found`);
    }

    // Stop all active projects
    const activeProjects = this.db.prepare('SELECT * FROM projects WHERE active = 1').all();
    for (const activeProject of activeProjects) {
      await this.dockerManager.stopProject(activeProject.name);
    }

    // Set all projects to inactive
    this.db.prepare('UPDATE projects SET active = 0').run();

    // Start the target project
    await this.dockerManager.startProject(name);

    // Set target project as active
    this.db.prepare('UPDATE projects SET active = 1, last_accessed = CURRENT_TIMESTAMP WHERE name = ?').run(name);

    return {
      content: [
        {
          type: 'text',
          text: `Switched to project: ${name}\nURL: http://localhost:${project.port}`,
        },
      ],
    };
  }

  async deleteProject(name, deleteFiles = false) {
    const project = this.db.prepare('SELECT * FROM projects WHERE name = ?').get(name);
    if (!project) {
      throw new Error(`Project ${name} not found`);
    }

    // Stop and remove containers
    await this.dockerManager.removeContainers(name);
    await this.dockerManager.removeDockerNetwork(name);

    // Delete from database
    this.db.prepare('DELETE FROM migrations WHERE project_id = ?').run(project.id);
    this.db.prepare('DELETE FROM projects WHERE id = ?').run(project.id);

    // Optionally delete files
    if (deleteFiles) {
      await fs.remove(project.path);
    }

    return {
      content: [
        {
          type: 'text',
          text: `Deleted project: ${name}${deleteFiles ? ' (including files)' : ''}`,
        },
      ],
    };
  }

  async createDockerFiles(projectPath, projectName, port) {
    // Create Dockerfile
    const dockerfile = `FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \\
    software-properties-common \\
    && add-apt-repository ppa:ondrej/php \\
    && apt-get update && apt-get install -y \\
    apache2 \\
    php8.3 \\
    php8.3-cli \\
    php8.3-common \\
    php8.3-mysql \\
    php8.3-xml \\
    php8.3-xmlrpc \\
    php8.3-curl \\
    php8.3-gd \\
    php8.3-imagick \\
    php8.3-mbstring \\
    php8.3-zip \\
    php8.3-intl \\
    php8.3-bz2 \\
    php8.3-bcmath \\
    php8.3-soap \\
    libapache2-mod-php8.3 \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

# Enable Apache modules
RUN a2enmod rewrite headers expires

# Configure Apache
RUN echo "ServerName localhost" >> /etc/apache2/apache2.conf

# Configure PHP
RUN echo "memory_limit = 256M" >> /etc/php/8.3/apache2/php.ini \\
    && echo "upload_max_filesize = 64M" >> /etc/php/8.3/apache2/php.ini \\
    && echo "post_max_size = 64M" >> /etc/php/8.3/apache2/php.ini \\
    && echo "max_execution_time = 300" >> /etc/php/8.3/apache2/php.ini

# Install WP-CLI
RUN curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar \\
    && chmod +x wp-cli.phar \\
    && mv wp-cli.phar /usr/local/bin/wp

# Set document root
WORKDIR /var/www/html

# Configure Apache virtual host
RUN echo '<VirtualHost *:80>\\n\\
    DocumentRoot /var/www/html\\n\\
    <Directory /var/www/html>\\n\\
        Options Indexes FollowSymLinks\\n\\
        AllowOverride All\\n\\
        Require all granted\\n\\
    </Directory>\\n\\
</VirtualHost>' > /etc/apache2/sites-available/000-default.conf

EXPOSE 80

CMD ["apache2ctl", "-D", "FOREGROUND"]`;

    await fs.writeFile(path.join(projectPath, 'Dockerfile'), dockerfile);

    // Create docker-compose.yml
    const dockerCompose = `version: '3.8'

services:
  wordpress:
    build: .
    container_name: wp-${projectName}-app
    ports:
      - "${port}:80"
    volumes:
      - .:/var/www/html
    environment:
      WORDPRESS_DB_HOST: db:3306
      WORDPRESS_DB_NAME: wordpress
      WORDPRESS_DB_USER: wordpress
      WORDPRESS_DB_PASSWORD: wordpress
    depends_on:
      - db
    networks:
      - wp-${projectName}-network

  db:
    image: mysql:8.0
    container_name: wp-${projectName}-db
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: wordpress
      MYSQL_USER: wordpress
      MYSQL_PASSWORD: wordpress
    volumes:
      - wp-${projectName}-db:/var/lib/mysql
    ports:
      - "${port + 1000}:3306"
    networks:
      - wp-${projectName}-network

volumes:
  wp-${projectName}-db:

networks:
  wp-${projectName}-network:
    driver: bridge`;

    await fs.writeFile(path.join(projectPath, 'docker-compose.yml'), dockerCompose);
  }

  async createWordPressConfig(projectPath) {
    const wpConfig = `<?php
/**
 * WordPress Configuration
 * 
 * This file supports both development and production environments
 */

// Environment detection
if (file_exists(__DIR__ . '/wp-config-local.php')) {
    // Local development settings
    require_once(__DIR__ . '/wp-config-local.php');
} else {
    // Production settings
    define('DB_NAME', getenv('DB_NAME') ?: 'wordpress');
    define('DB_USER', getenv('DB_USER') ?: 'wordpress');
    define('DB_PASSWORD', getenv('DB_PASSWORD') ?: 'wordpress');
    define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
}

define('DB_CHARSET', 'utf8mb4');
define('DB_COLLATE', '');

// Authentication keys and salts
define('AUTH_KEY',         'put your unique phrase here');
define('SECURE_AUTH_KEY',  'put your unique phrase here');
define('LOGGED_IN_KEY',    'put your unique phrase here');
define('NONCE_KEY',        'put your unique phrase here');
define('AUTH_SALT',        'put your unique phrase here');
define('SECURE_AUTH_SALT', 'put your unique phrase here');
define('LOGGED_IN_SALT',   'put your unique phrase here');
define('NONCE_SALT',       'put your unique phrase here');

$table_prefix = 'wp_';

define('WP_DEBUG', false);

if (!defined('ABSPATH')) {
    define('ABSPATH', __DIR__ . '/');
}

require_once ABSPATH . 'wp-settings.php';`;

    await fs.writeFile(path.join(projectPath, 'wp-config.php'), wpConfig);

    // Create local config
    const wpConfigLocal = `<?php
// Local development database settings
define('DB_NAME', 'wordpress');
define('DB_USER', 'wordpress');
define('DB_PASSWORD', 'wordpress');
define('DB_HOST', 'db:3306');

// Development settings
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);`;

    await fs.writeFile(path.join(projectPath, 'wp-config-local.php'), wpConfigLocal);
  }

  async createGitIgnore(projectPath) {
    const gitignore = `# WordPress core files (we're tracking these for SiteGround deployment)
# But ignore local-only files
wp-config-local.php
.env
.env.local

# Uploads directory (large files)
wp-content/uploads/

# Cache and temp files
wp-content/cache/
wp-content/temp/
wp-content/upgrade/

# Logs
*.log
wp-content/debug.log

# Database dumps (except migrations)
*.sql
!migrations/*.sql

# OS files
.DS_Store
Thumbs.db

# Editor files
.vscode/
.idea/
*.swp
*.swo

# Docker
docker-compose.override.yml

# Node modules (if any)
node_modules/

# Backup files
*.bak
*.backup
*~`;

    await fs.writeFile(path.join(projectPath, '.gitignore'), gitignore);
  }

  async waitForWordPress(port, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`http://localhost:${port}/wp-admin/install.php`);
        if (response.ok) {
          return true;
        }
      } catch (error) {
        // Not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    throw new Error('WordPress did not start in time');
  }

  getProject(name) {
    return this.db.prepare('SELECT * FROM projects WHERE name = ?').get(name);
  }

  updateLastAccessed(name) {
    this.db.prepare('UPDATE projects SET last_accessed = CURRENT_TIMESTAMP WHERE name = ?').run(name);
  }
}