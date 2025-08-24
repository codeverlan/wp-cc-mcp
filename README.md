# WordPress MCP Server (wp-cc-mcp)

An MCP (Model Context Protocol) server for managing WordPress development with a Docker → Git → SiteGround deployment pipeline.

## Overview

This MCP server provides comprehensive WordPress development tools that enable Claude Code to:
- Create and manage multiple WordPress projects locally using Docker
- Version control everything with Git
- Prepare deployments for SiteGround hosting
- Research and generate content using AI tools
- Manage databases with migration tracking

## Architecture

```
Local Development (Docker) → Version Control (Git) → Production (SiteGround)
       ↑                           ↑                        ↑
    MCP Server              Automatic Commits         Manual Deploy
```

## Installation

### Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ installed
- Git installed
- Claude Code with MCP support

### Setup

1. **Clone the repository:**
```bash
cd /home/thornlcsw/docker/wp-cc-mcp
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**
Create a `.env` file:
```env
# Optional: For research features
JINA_API_KEY=your_jina_api_key
UNSPLASH_API_KEY=your_unsplash_api_key
```

4. **Add to Claude Code settings:**
Edit `~/.claude/settings.local.json`:
```json
{
  "mcpServers": {
    "wp-cc-mcp": {
      "command": "node",
      "args": ["/home/thornlcsw/docker/wp-cc-mcp/index.js"],
      "env": {
        "JINA_API_KEY": "your_key",
        "UNSPLASH_API_KEY": "your_key"
      }
    }
  }
}
```

## Available Tools

### Project Management

#### `wp_create_project`
Create a new WordPress project with Docker and Git.
- **Parameters:**
  - `name`: Project name (alphanumeric and hyphens only)
  - `port`: Local port for WordPress (e.g., 8081)
  - `gitRemote`: Optional Git remote URL

#### `wp_list_projects`
List all WordPress projects with their status.

#### `wp_switch_project`
Switch between projects (stops current, starts target).
- **Parameters:**
  - `name`: Project name to switch to

#### `wp_delete_project`
Delete a WordPress project.
- **Parameters:**
  - `name`: Project name to delete
  - `deleteFiles`: Also delete project files (default: false)

### Docker Management

#### `wp_start`
Start Docker containers for a project.
- **Parameters:**
  - `project`: Project name

#### `wp_stop`
Stop Docker containers for a project.
- **Parameters:**
  - `project`: Project name

#### `wp_restart`
Restart Docker containers for a project.
- **Parameters:**
  - `project`: Project name

#### `wp_logs`
View Docker container logs.
- **Parameters:**
  - `project`: Project name
  - `service`: Service name (wordpress or db)
  - `lines`: Number of log lines to show

### Database Management

#### `wp_db_dump`
Export database to SQL file with migration tracking.
- **Parameters:**
  - `project`: Project name
  - `message`: Migration message/description

#### `wp_db_diff`
Generate migration script from database changes.
- **Parameters:**
  - `project`: Project name

#### `wp_db_import`
Import SQL file to database.
- **Parameters:**
  - `project`: Project name
  - `file`: SQL file path (relative to project)

#### `wp_db_reset`
Reset database by applying all migrations from scratch.
- **Parameters:**
  - `project`: Project name

### WordPress Development

#### `wp_install_theme`
Install a WordPress theme.
- **Parameters:**
  - `project`: Project name
  - `source`: Theme source (path, URL, or slug)
  - `activate`: Activate theme after installation

#### `wp_install_plugin`
Install a WordPress plugin.
- **Parameters:**
  - `project`: Project name
  - `source`: Plugin source (path, slug, or URL)
  - `activate`: Activate plugin after installation

#### `wp_configure`
Update WordPress configuration.
- **Parameters:**
  - `project`: Project name
  - `settings`: Configuration settings object

### Git Operations

#### `wp_git_status`
Check Git status for a project.
- **Parameters:**
  - `project`: Project name

#### `wp_git_commit`
Commit changes to Git.
- **Parameters:**
  - `project`: Project name
  - `message`: Commit message

#### `wp_prepare_deployment`
Prepare project for deployment (dump DB, check Git, create checklist).
- **Parameters:**
  - `project`: Project name

### Research Tools (Phase 2)

#### `wp_research_topic`
Research a topic using Jina AI.
- **Parameters:**
  - `project`: Project name
  - `query`: Research query

#### `wp_scrape_site`
Scrape content from a website.
- **Parameters:**
  - `project`: Project name
  - `url`: URL to scrape

#### `wp_find_images`
Find and download images from Unsplash.
- **Parameters:**
  - `project`: Project name
  - `topic`: Image search topic
  - `count`: Number of images to download

#### `wp_generate_content`
Generate content from research data.
- **Parameters:**
  - `project`: Project name
  - `template`: Content template type
  - `data`: Data for content generation

#### `wp_import_json`
Import JSON data to create WordPress content.
- **Parameters:**
  - `project`: Project name
  - `file`: JSON file path

#### `wp_generate_seo_pages`
Generate SEO-optimized location/category pages.
- **Parameters:**
  - `project`: Project name
  - `config`: SEO configuration with locations and categories

## Workflow Examples

### 1. Create a New WordPress Project
```
1. wp_create_project("my-site", 8081, "git@github.com:user/my-site.git")
2. Project is created with WordPress, Docker starts, Git initialized
3. Access at http://localhost:8081
```

### 2. Develop a Custom Theme
```
1. wp_install_theme("my-site", "/path/to/theme", true)
2. Make changes to theme files (automatically reflected via Docker volumes)
3. wp_git_commit("my-site", "Updated theme styles")
```

### 3. Database Migration Workflow
```
1. Make database changes in WordPress admin
2. wp_db_dump("my-site", "added_custom_post_types")
3. Changes are tracked in migrations/
4. wp_git_commit("my-site", "Database migration: added custom post types")
```

### 4. Prepare for Deployment
```
1. wp_prepare_deployment("my-site")
2. Review checklist
3. Push to Git repository
4. On SiteGround: pull from Git and import database
```

### 5. Research and Content Generation
```
1. wp_research_topic("my-site", "best coffee shops in Seattle")
2. wp_find_images("my-site", "coffee shop", 10)
3. wp_generate_seo_pages("my-site", {
     locations: ["Seattle", "Portland"],
     categories: ["Coffee Shops", "Cafes"]
   })
```

## Project Structure

Each WordPress project follows this structure:
```
/home/thornlcsw/wp-projects/project-name/
├── wp-admin/              # WordPress core
├── wp-includes/           # WordPress core
├── wp-content/            # Themes, plugins, uploads
├── wp-config.php          # Main config (production-ready)
├── wp-config-local.php    # Local development config
├── migrations/            # Database migrations
│   ├── 001_initial.sql
│   └── migration_log.json
├── research/              # Research data (Jina AI)
├── scraped/               # Scraped content
├── generated-content/     # Generated HTML content
├── docker-compose.yml     # Docker configuration
├── Dockerfile            # WordPress container definition
├── .git/                 # Git repository
└── .gitignore           # Git ignore rules
```

## Database Management

### Migration Files
- Automatically numbered (001, 002, etc.)
- Include timestamps and descriptions
- Tracked in `migration_log.json`
- Committed to Git for deployment

### Environment Detection
The `wp-config.php` file automatically detects environment:
- Local: Uses `wp-config-local.php` if present
- Production: Uses environment variables

## Security Notes

- Never commit credentials to Git
- Use `.env` files for API keys
- Database passwords are environment-specific
- Production credentials should be set on SiteGround

## Troubleshooting

### Port Already in Use
If a port is already in use, choose a different port when creating the project.

### Docker Containers Not Starting
1. Check Docker is running: `docker ps`
2. Check logs: `wp_logs("project-name")`
3. Verify port availability

### Database Connection Issues
1. Wait for MySQL to fully start (takes 10-30 seconds)
2. Check credentials in wp-config-local.php
3. Verify container name matches project

### Git Remote Issues
1. Ensure SSH keys are configured for Git
2. Verify remote URL is correct
3. Check repository permissions

## Development Notes

### Adding New Tools
1. Define tool in `index.js` ListToolsRequestSchema
2. Implement handler in appropriate manager
3. Update this README

### Debugging
- Logs are available via `wp_logs` tool
- MCP server logs to stderr
- Docker logs: `docker-compose logs -f`

## SiteGround Integration

### Overview
This MCP server now includes full integration with SiteGround's native Git functionality, allowing seamless deployment from local Docker development to SiteGround hosting.

### Setting Up SiteGround Integration

#### 1. Create WordPress Installation on SiteGround
- Log into SiteGround Site Tools
- Create a new WordPress installation
- Enable Git for the installation (creates a Git repository)
- Note the SSH credentials provided (example: `ssh://u1836-xxxxx@gvam1275.siteground.biz:18765/home/customer/www/domain.com/public_html/`)

#### 2. SSH Key Setup
**Important**: You need to set up SSH keys for passwordless authentication:

1. Generate an SSH key pair if you don't have one:
```bash
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
```

2. Add your public key to SiteGround:
   - Go to Site Tools → SSH Keys Manager
   - Click "Import" to add an existing key, or "Generate" to create a new one
   - If importing, paste your public key (`~/.ssh/id_rsa.pub`)
   - Authorize the key for your account

3. Test the connection:
```bash
ssh -p 18765 u1836-xxxxx@gvam1275.siteground.biz
```

#### 3. Connect Your Project
```javascript
wp_siteground_connect(
  "my-project",
  "gvam1275.siteground.biz",
  "u1836-xxxxx",
  "home/customer/www/domain.com/public_html",
  "https://domain.com"
)
```

### SiteGround-Specific Tools

#### `wp_siteground_connect`
Connect a local WordPress project to SiteGround Git repository.
- **Parameters:**
  - `project`: Local project name
  - `sshHost`: SiteGround server (e.g., gvam1275.siteground.biz)
  - `sshUser`: SSH username (e.g., u1836-xxxxx)
  - `repoPath`: Repository path (e.g., home/customer/www/domain.com/public_html)
  - `siteUrl`: Optional live site URL

#### `wp_siteground_deploy`
Deploy your project to SiteGround with a single command.
- **Parameters:**
  - `project`: Project name to deploy
  - `branch`: Branch to deploy (default: master)
  - `clearCache`: Clear SiteGround cache after deployment (default: true)
  - `skipDatabaseDump`: Skip database backup (default: false)
  - `message`: Optional commit message

#### `wp_siteground_sync`
Pull changes from SiteGround (useful for syncing live changes).
- **Parameters:**
  - `project`: Project name
  - `branch`: Branch to sync (default: master)

#### `wp_siteground_cache_clear`
Clear SiteGround's cache via SSH.
- **Parameters:**
  - `project`: Project name

#### `wp_siteground_info`
Get deployment information for a project.
- **Parameters:**
  - `project`: Project name

### Deployment Workflow

#### Complete Setup Example
```javascript
// 1. Create a new WordPress project
wp_create_project("tylerhorn", 8085)

// 2. Connect to SiteGround
wp_siteground_connect(
  "tylerhorn",
  "gvam1275.siteground.biz",
  "u1836-0gj8kch3wtnk",
  "home/customer/www/tylerhorn.com/public_html",
  "https://tylerhorn.com"
)

// 3. Develop your site locally
// (Make theme changes, install plugins, etc.)

// 4. Deploy to SiteGround
wp_siteground_deploy("tylerhorn", {
  message: "Initial deployment",
  clearCache: true
})
```

#### Continuous Deployment
```javascript
// Make local changes
wp_git_commit("tylerhorn", "Updated homepage design")

// Deploy to production
wp_siteground_deploy("tylerhorn")

// Or sync from production
wp_siteground_sync("tylerhorn")
```

### SiteGround .gitignore
The system automatically creates a SiteGround-optimized `.gitignore` that excludes:
- WordPress core files (managed by SiteGround)
- Upload directories
- Cache directories
- Database dumps
- Environment-specific configurations

Default excludes from SiteGround:
```
wp-content/upgrade/*
wp-content/backup-db/*
wp-content/cache/*
wp-content/cache/supercache/*
wp-content/w3tc-cache/*
```

### Database Management with SiteGround

When deploying database changes:

1. **Before deployment**: Database is automatically dumped
2. **After deployment**: SSH into SiteGround and import:
```bash
ssh -p 18765 u1836-xxxxx@server.siteground.biz
cd ~/public_html
wp db import migrations/latest.sql
```

### Troubleshooting SiteGround Integration

#### SSH Connection Issues
- Ensure your SSH key is added to SiteGround's SSH Keys Manager
- Verify the key is authorized for your account
- Check that port 18765 is not blocked by your firewall

#### Git Push Failures
- Verify your local changes are committed
- Check that the SiteGround repository exists
- Ensure you have write permissions to the repository

#### Cache Not Clearing
- The WP-CLI command `wp sg purge` requires SiteGround Optimizer plugin
- Manual cache clearing can be done through Site Tools

## Comparison with Original wp-cc

This MCP implementation **simplifies** the original wp-cc by:
- ✅ Removing SSH/SCP dependencies (except for SiteGround Git)
- ✅ Removing Digital Ocean API complexity
- ✅ Using Git for deployment (industry standard)
- ✅ Adding proper database versioning
- ✅ Supporting multiple projects
- ✅ Direct integration with SiteGround's native Git
- ✅ Automated cache management for SiteGround

## License

MIT

## Support

For issues or questions, check the logs or review the source code in `/home/thornlcsw/docker/wp-cc-mcp/`.