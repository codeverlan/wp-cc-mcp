# WordPress Super MCP - Complete Tool List

## 📁 Project Management Tools (4 tools)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `wp_create_project` | Create new WordPress project with Docker and Git | `name`, `port`, `gitRemote` (optional) |
| `wp_list_projects` | List all WordPress projects with status | none |
| `wp_switch_project` | Switch between projects (stops current, starts target) | `name` |
| `wp_delete_project` | Delete a WordPress project | `name`, `deleteFiles` (optional) |

## 🐳 Docker Management Tools (4 tools)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `wp_start` | Start Docker containers for a project | `project` |
| `wp_stop` | Stop Docker containers for a project | `project` |
| `wp_restart` | Restart Docker containers for a project | `project` |
| `wp_logs` | View Docker container logs | `project`, `service`, `lines` |

## 💾 Database Management Tools (4 tools)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `wp_db_dump` | Export database with migration tracking | `project`, `message` |
| `wp_db_diff` | Generate migration script from changes | `project` |
| `wp_db_import` | Import SQL file to database | `project`, `file` |
| `wp_db_reset` | Reset database from migrations | `project` |

## 🎨 WordPress Development Tools (3 tools)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `wp_install_theme` | Install WordPress theme | `project`, `source`, `activate` |
| `wp_install_plugin` | Install WordPress plugin | `project`, `source`, `activate` |
| `wp_configure` | Update WordPress configuration | `project`, `settings` |

## 🔄 Git Operations Tools (3 tools)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `wp_git_status` | Check Git status for a project | `project` |
| `wp_git_commit` | Commit changes to Git | `project`, `message` |
| `wp_prepare_deployment` | Prepare for deployment (dump DB, check Git) | `project` |

## 🔍 Research & Content Tools (8 tools)

| Tool | Description | Key Parameters | Requirements |
|------|-------------|----------------|--------------|
| `wp_research_topic` | Natural language research - auto-detects search/URL | `project`, `query` | JINA_API_KEY |
| `wp_research_exhaustive` | Comprehensive multi-query research | `project`, `query` | JINA_API_KEY |
| `wp_validate_research` | Validate research data completeness | `project`, `dataFile` | none |
| `wp_scrape_site` | Scrape content from a website | `project`, `url` | none |
| `wp_find_images` | Download images from Unsplash | `project`, `topic`, `count` | UNSPLASH_API_KEY |
| `wp_generate_content` | Generate HTML content from templates | `project`, `template`, `data` | none |
| `wp_import_json` | Import JSON data to WordPress | `project`, `file` | none |
| `wp_generate_seo_pages` | Generate SEO-optimized location/category pages | `project`, `config` | none |

## 🌐 SiteGround Integration Tools (5 tools)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `wp_siteground_connect` | Connect project to SiteGround Git repository | `project`, `sshHost`, `sshUser`, `repoPath`, `siteUrl` |
| `wp_siteground_deploy` | Deploy via Git push to SiteGround | `project`, `branch`, `clearCache`, `skipDatabaseDump`, `message` |
| `wp_siteground_sync` | Pull changes from SiteGround repository | `project`, `branch` |
| `wp_siteground_cache_clear` | Clear SiteGround cache via SSH | `project` |
| `wp_siteground_info` | Get deployment information | `project` |

## 🧪 Testing & Validation Tools (4 tools)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `wp_test_all_links` | Test all links for 404 errors | `project` |
| `wp_test_seo` | Validate SEO implementation (meta tags, H1, schema) | `project` |
| `wp_test_comprehensive` | Run complete test suite and generate report | `project` |
| `wp_test_report` | Generate human-readable test report | `project` |

## 🛠️ WP-CLI Content Management Tools (14 tools)

| Tool | Description | Key Parameters | Special Features |
|------|-------------|----------------|------------------|
| `wp_cli_create_post` | Create WordPress posts with full metadata | `project`, `title`, `content`, `status`, `category`, `tags`, `meta` | Supports custom meta fields |
| `wp_cli_bulk_import_csv` | **Bulk import articles from CSV** | `project`, `csvPath` | Maps Article Title, Target Keyword, Categories, Tags |
| `wp_cli_manage_posts` | List, update, or delete posts | `project`, `action`, `postId`, `data` | Actions: list, update, delete |
| `wp_cli_manage_users` | Full user administration | `project`, `action`, `username`, `email`, `userId`, `role` | Actions: create, update, delete, list |
| `wp_cli_manage_plugins` | Plugin lifecycle management | `project`, `action`, `plugin`, `activate` | Actions: install, activate, deactivate, delete, list |
| `wp_cli_manage_themes` | Theme management | `project`, `action`, `theme` | Actions: install, activate, delete, list |
| `wp_cli_manage_media` | Media handling | `project`, `action`, `filePath`, `postId` | Actions: import, regenerate |
| `wp_cli_manage_terms` | **Create categories AND tags** | `project`, `action`, `taxonomy`, `term`, `termId` | Use taxonomy='post_tag' for tags, 'category' for categories |
| `wp_cli_search_replace` | Database search and replace | `project`, `search`, `replace`, `dryRun` | Default dry run for safety |
| `wp_cli_manage_options` | WordPress settings management | `project`, `action`, `option`, `value` | Actions: get, update, delete |
| `wp_cli_cache_flush` | Cache management | `project`, `type` | Types: all, object, rewrite, transient |
| `wp_cli_maintenance_mode` | Maintenance mode control | `project`, `enable` | Boolean enable/disable |
| `wp_cli_run_cron` | Cron event execution | `project`, `hook` | Run all or specific hooks |
| `wp_cli_custom` | Run any custom WP-CLI command | `project`, `command`, `args` | Full flexibility |

## 🌐 WordPress REST API Tools (6 tools)

| Tool | Description | Key Parameters | Special Features |
|------|-------------|----------------|------------------|
| `wp_rest_create_content` | Create posts or pages via REST API | `project`, `type`, `title`, `content`, `status`, `meta` | Supports custom meta |
| `wp_rest_upload_media` | Upload media with metadata | `project`, `filePath`, `title`, `altText` | Auto-generates alt text |
| `wp_rest_manage_taxonomies` | **Manage categories AND tags via API** | `project`, `type`, `action`, `name`, `id` | type='category' or 'tag' |
| `wp_rest_search` | Search WordPress content | `project`, `query`, `type` | Filter by content type |
| `wp_rest_set_credentials` | Configure REST API authentication | `project`, `username`, `password` | Stores per-project |
| `wp_rest_health_check` | Verify REST API accessibility | `project` | Tests connectivity |

---

## 📊 Total Tool Count: **55 Tools**

### Tool Categories Summary:
- 4 Project Management
- 4 Docker Management  
- 4 Database Management
- 3 WordPress Development
- 3 Git Operations
- 8 Research & Content (AI-powered)
- 5 SiteGround Integration
- 4 Testing & Validation
- 14 WP-CLI Tools (NEW)
- 6 REST API Tools (NEW)

## 🏷️ Tag Creation Examples

### Using WP-CLI:
```javascript
// Create a tag
wp_cli_manage_terms("parenting-fm", "create", "post_tag", "sleep-training")

// Create a category
wp_cli_manage_terms("parenting-fm", "create", "category", "Behavioral Challenges")

// List all tags
wp_cli_manage_terms("parenting-fm", "list", "post_tag")
```

### Using REST API:
```javascript
// Create a tag
wp_rest_manage_taxonomies("parenting-fm", "tag", "create", "toddler-tantrums")

// Create a category  
wp_rest_manage_taxonomies("parenting-fm", "category", "create", "Family Governance")

// List all tags
wp_rest_manage_taxonomies("parenting-fm", "tag", "list")
```

### In CSV Import:
The `wp_cli_bulk_import_csv` tool automatically:
- Creates categories from the "Category" column
- Can parse tags from a "Tags" column (comma-separated)
- Maps all custom fields to post meta

## 🚀 Key Features for Parenting.fm

### Content Import Pipeline:
1. **CSV Import**: `wp_cli_bulk_import_csv` imports your 224 articles
2. **Category Creation**: Automatically creates categories from CSV
3. **Tag Support**: Full tag creation and management
4. **Meta Fields**: Maps Target Keyword, Search Volume, Competition to post meta
5. **Bulk Operations**: Process all articles in one command

### Complete Taxonomy Management:
- ✅ Categories (5 main categories)
- ✅ Tags (unlimited, searchable)
- ✅ Custom taxonomies (if needed)
- ✅ Hierarchical terms (parent/child)
- ✅ Term descriptions and slugs

### Research to Publishing Pipeline:
1. Research: `wp_research_topic` → Natural language queries
2. Import: `wp_cli_bulk_import_csv` → 224 articles from CSV
3. Media: `wp_find_images` → Unsplash images
4. Test: `wp_test_comprehensive` → Zero 404 policy
5. Deploy: `wp_siteground_deploy` → Push to production