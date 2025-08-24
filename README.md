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

## Comparison with Original wp-cc

This MCP implementation **simplifies** the original wp-cc by:
- ✅ Removing SSH/SCP dependencies
- ✅ Removing Digital Ocean API complexity
- ✅ Using Git for deployment (industry standard)
- ✅ Adding proper database versioning
- ✅ Supporting multiple projects
- ✅ Working with any Git-capable host

## License

MIT

## Support

For issues or questions, check the logs or review the source code in `/home/thornlcsw/docker/wp-cc-mcp/`.