# WordPress MCP Server (wp-cc-mcp)

An MCP (Model Context Protocol) server for managing WordPress development with a Docker → Git → SiteGround deployment pipeline.

## Overview

This MCP server provides comprehensive WordPress development tools that enable Claude Code to:
- Create and manage multiple WordPress projects locally using Docker
- Perform exhaustive testing with zero 404 tolerance
- Research and generate content using AI tools (Jina AI, Unsplash)
- Manage databases with migration tracking
- Deploy seamlessly to SiteGround hosting
- Validate SEO implementation and content quality

## Architecture

```
Local Development (Docker) → Version Control (Git) → Production (SiteGround)
       ↑                           ↑                        ↑
    MCP Server              Automatic Commits         Git Push Deploy
       ↑                           ↑                        ↑
Testing & Validation      Research & Content        Cache Management
```

## Installation

### Prerequisites
- Docker and Docker Compose
- Node.js 18+
- Git
- Claude Code with MCP support
- Optional: Playwright for testing features

### Setup

1. **Clone the repository:**
```bash
git clone https://github.com/codeverlan/wp-cc-mcp.git
cd wp-cc-mcp
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**
Create a `.env` file:
```env
# Optional: For AI research features
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
      "args": ["/path/to/wp-cc-mcp/index.js"],
      "env": {
        "JINA_API_KEY": "your_key",
        "UNSPLASH_API_KEY": "your_key"
      }
    }
  }
}
```

## Complete Tool Reference

### 📁 Project Management Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `wp_create_project` | Create new WordPress project with Docker and Git | `name`, `port`, `gitRemote` (optional) |
| `wp_list_projects` | List all WordPress projects with status | none |
| `wp_switch_project` | Switch between projects (stops current, starts target) | `name` |
| `wp_delete_project` | Delete a WordPress project | `name`, `deleteFiles` (optional) |

### 🐳 Docker Management Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `wp_start` | Start Docker containers for a project | `project` |
| `wp_stop` | Stop Docker containers for a project | `project` |
| `wp_restart` | Restart Docker containers for a project | `project` |
| `wp_logs` | View Docker container logs | `project`, `service`, `lines` |

### 💾 Database Management Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `wp_db_dump` | Export database with migration tracking | `project`, `message` |
| `wp_db_diff` | Generate migration script from changes | `project` |
| `wp_db_import` | Import SQL file to database | `project`, `file` |
| `wp_db_reset` | Reset database from migrations | `project` |

### 🔄 Git Operations Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `wp_git_status` | Check Git status for a project | `project` |
| `wp_git_commit` | Commit changes to Git | `project`, `message` |
| `wp_prepare_deployment` | Prepare for deployment (dump DB, check Git) | `project` |

### 🌐 SiteGround Integration Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `wp_siteground_connect` | Connect project to SiteGround Git repository | `project`, `sshHost`, `sshUser`, `repoPath`, `siteUrl` |
| `wp_siteground_deploy` | Deploy via Git push to SiteGround | `project`, `branch`, `clearCache`, `skipDatabaseDump`, `message` |
| `wp_siteground_sync` | Pull changes from SiteGround repository | `project`, `branch` |
| `wp_siteground_cache_clear` | Clear SiteGround cache via SSH | `project` |
| `wp_siteground_info` | Get deployment information | `project` |

### 🧪 Testing & Validation Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `wp_test_all_links` | Test all links for 404 errors | `project` |
| `wp_test_seo` | Validate SEO implementation (meta tags, H1, schema) | `project` |
| `wp_test_comprehensive` | Run complete test suite and generate report | `project` |
| `wp_test_report` | Generate human-readable test report | `project` |

### 🔍 Research & Content Tools (AI-Powered)

| Tool | Description | Parameters | Requirements |
|------|-------------|------------|--------------|
| `wp_research_topic` | Basic topic research using Jina AI | `project`, `query` | JINA_API_KEY |
| `wp_research_exhaustive` | Comprehensive multi-query research | `project`, `query` | JINA_API_KEY |
| `wp_validate_research` | Validate research data completeness | `project`, `dataFile` | none |
| `wp_scrape_site` | Scrape content from a website | `project`, `url` | none |
| `wp_find_images` | Download images from Unsplash | `project`, `topic`, `count` | UNSPLASH_API_KEY |
| `wp_generate_content` | Generate HTML content from templates | `project`, `template`, `data` | none |
| `wp_import_json` | Import JSON data to WordPress | `project`, `file` | none |
| `wp_generate_seo_pages` | Generate SEO-optimized location/category pages | `project`, `config` | none |

### 🎨 WordPress Development Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `wp_install_theme` | Install WordPress theme | `project`, `source`, `activate` |
| `wp_install_plugin` | Install WordPress plugin | `project`, `source`, `activate` |
| `wp_configure` | Update WordPress configuration | `project`, `settings` |

## Workflow Examples

### Complete Project Lifecycle
```javascript
// 1. Create project
wp_create_project("my-blog", 8082)

// 2. Research content (if using AI features)
wp_research_exhaustive("my-blog", "sustainable living tips")
wp_validate_research("my-blog", "research/data.json")
wp_find_images("my-blog", "sustainable living", 20)

// 3. Develop
wp_install_theme("my-blog", "twentytwentyfour", true)
wp_install_plugin("my-blog", "yoast-seo", true)

// 4. Test thoroughly
wp_test_comprehensive("my-blog")
wp_test_report("my-blog")

// 5. Deploy to SiteGround
wp_siteground_connect("my-blog", "server.siteground.biz", "user", "path", "https://myblog.com")
wp_siteground_deploy("my-blog")
```

### Database Migration Workflow
```javascript
// Before changes
wp_db_dump("my-blog", "Before adding custom post types")

// Make changes in WordPress admin...

// After changes
wp_db_dump("my-blog", "Added events custom post type")
wp_git_commit("my-blog", "Add events functionality")
```

### Testing Workflow
```javascript
// Run individual tests
wp_test_all_links("my-blog")  // Check for 404s
wp_test_seo("my-blog")        // Validate SEO

// Or run everything
wp_test_comprehensive("my-blog")
wp_test_report("my-blog")      // Get readable report
```

## Project Structure

```
/home/thornlcsw/wp-projects/project-name/
├── docker-compose.yml        # Docker configuration
├── Dockerfile               # WordPress container
├── .env                     # Environment variables
├── wp-content/              # Themes, plugins, uploads
├── wp-config.php           # Production config
├── wp-config-local.php     # Local dev config
├── migrations/             # Database migrations
│   ├── 001_initial.sql
│   └── migration_log.json
├── test-results/           # Test reports
│   ├── link-test-*.json
│   ├── seo-validation-*.json
│   └── test-report-*.md
├── research/               # AI research data
├── scraped/               # Scraped content
├── generated-content/     # Generated HTML
└── .git/                  # Git repository
```

## Testing Features

### Zero 404 Policy
The testing framework enforces zero tolerance for broken links:
- Validates all internal and external links
- Checks navigation menus
- Tests category and tag pages
- Identifies broken image references

### SEO Validation
Comprehensive SEO checks include:
- Meta title length (30-60 characters)
- Meta descriptions presence
- Single H1 per page enforcement
- Image alt text validation
- Open Graph tags
- Schema.org markup

### Test Reports
Test results are saved in multiple formats:
- JSON for programmatic access
- Markdown for human readability
- Comprehensive logs with timestamps

## AI-Powered Features

### Jina AI Integration
When JINA_API_KEY is configured:
- Exhaustive topic research
- Competitor analysis
- Market trend research
- Content idea generation

### Unsplash Integration
When UNSPLASH_API_KEY is configured:
- High-quality image search
- Automatic download and organization
- Attribution tracking
- Multiple image formats

## Security Considerations

- Never commit `.env` files with API keys
- Database passwords are environment-specific
- SSH keys must be properly configured for SiteGround
- Production credentials should be set on the server
- Use Git ignore for sensitive files

## Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Find process using port
lsof -i :8081
# Or use a different port when creating project
```

**Docker Containers Not Starting**
```javascript
wp_logs("project-name", "wordpress", 50)
```

**Testing Failures**
```javascript
// Get detailed test report
wp_test_report("project-name")
// Check specific issues
wp_test_all_links("project-name")
```

**Database Connection Issues**
- Wait 10-30 seconds for MySQL to start
- Check credentials in wp-config-local.php
- Verify container names match project

## Version History

### v1.1.0 (Current)
- Added comprehensive testing framework
- Enhanced research with validation
- Playwright integration for testing
- Zero 404 policy enforcement
- Improved workflow documentation

### v1.0.0
- Initial MCP implementation
- SiteGround Git integration
- Docker-based development
- Basic research tools

## License

MIT

## Support

For issues or feature requests, please open an issue on [GitHub](https://github.com/codeverlan/wp-cc-mcp).