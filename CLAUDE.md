# WordPress MCP Server - Claude Code Integration Guide

## Overview
This MCP server enables comprehensive WordPress development through Claude Code, with enhanced testing, validation, and deployment workflows.

## Complete Workflow Phases

### Phase 1: Project Setup
```javascript
// Create new WordPress project
wp_create_project("my-site", 8081)

// Connect to SiteGround (optional)
wp_siteground_connect("my-site", "server.siteground.biz", "username", "path", "https://site.com")
```

### Phase 2: Research & Content (Optional but Recommended)
```javascript
// Exhaustive research for comprehensive data
wp_research_exhaustive("my-site", "coffee shops in Seattle")

// Validate research data completeness
wp_validate_research("my-site", "research/data.json")

// Find and download images
wp_find_images("my-site", "coffee shop", 10)

// Generate content from research
wp_generate_content("my-site", "directory_listing", data)
```

### Phase 3: Development
```javascript
// Install themes and plugins
wp_install_theme("my-site", "/path/to/theme", true)
wp_install_plugin("my-site", "yoast-seo", true)

// Make development changes
// ... your custom development work ...

// Commit changes regularly
wp_git_commit("my-site", "Added custom post types")
```

### Phase 4: Testing & Validation (MANDATORY Before Deployment)
```javascript
// Run comprehensive test suite
wp_test_comprehensive("my-site")

// Or run individual tests:
wp_test_all_links("my-site")  // Check for 404 errors
wp_test_seo("my-site")        // Validate SEO implementation

// Generate test report
wp_test_report("my-site")
```

### Phase 5: Deployment
```javascript
// Prepare for deployment (includes automatic testing)
wp_prepare_deployment("my-site")

// Deploy to SiteGround
wp_siteground_deploy("my-site", {
  branch: "master",
  clearCache: true,
  message: "Production deployment after testing"
})
```

## Testing Requirements

### Zero 404 Policy
All WordPress sites MUST pass link validation before deployment:
- Every link must be tested
- Header navigation links
- Footer links
- Content links
- Directory/taxonomy pages
- No 404 errors allowed

### SEO Validation
Sites must pass SEO checks:
- Meta titles (30-60 characters)
- Meta descriptions
- Single H1 per page
- Alt text for images
- Open Graph tags
- Schema.org markup

### Test Results
Test results are saved in `project-name/test-results/` with:
- Individual test results (JSON)
- Comprehensive test reports (JSON)
- Human-readable reports (Markdown)

## Enhanced Research Capabilities

### Exhaustive Research
The `wp_research_exhaustive` tool performs comprehensive data collection:
- Features and benefits
- Pricing information
- Reviews and ratings
- Pros and cons
- Use cases
- Technical specifications
- Competitor analysis
- Market trends

### Research Validation
The `wp_validate_research` tool ensures data quality:
- Checks required fields (name, description, category)
- Validates recommended fields (features, pricing, pros/cons)
- Verifies SEO data presence
- Reports completeness statistics

## Workflow Best Practices

### 1. Always Test Before Deployment
```javascript
// Bad Practice - Deploy without testing
wp_siteground_deploy("my-site")

// Good Practice - Test first
wp_test_comprehensive("my-site")
// Review results, fix issues if needed
wp_siteground_deploy("my-site")
```

### 2. Use Exhaustive Research for Directory Sites
```javascript
// For directory/listing sites
wp_research_exhaustive("my-site", "AI writing tools")
wp_validate_research("my-site", "research/exhaustive_research_*.json")
wp_import_json("my-site", "research/validated_data.json")
```

### 3. Regular Git Commits
```javascript
// Commit after significant changes
wp_git_commit("my-site", "Added product catalog")
wp_git_commit("my-site", "Configured SEO settings")
wp_git_commit("my-site", "Fixed responsive design issues")
```

### 4. Database Migration Tracking
```javascript
// Before making database changes
wp_db_dump("my-site", "Before adding custom fields")

// After changes
wp_db_dump("my-site", "Added ACF fields for products")
```

## Testing Integration with Playwright

The testing tools integrate with Playwright MCP server if available. Ensure Playwright is configured in your Claude Code settings for best results.

### Playwright MCP Configuration
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-playwright"]
    }
  }
}
```

## Error Resolution

### Common Testing Failures

#### 404 Errors
1. Run `wp_test_all_links` to identify broken links
2. Review the test results in `test-results/link-test-*.json`
3. Fix broken links in WordPress admin or theme files
4. Re-run tests to verify fixes

#### SEO Issues
1. Run `wp_test_seo` to identify SEO problems
2. Common fixes:
   - Add meta descriptions via SEO plugin
   - Ensure single H1 tag per page
   - Add alt text to images
   - Implement Open Graph tags

### Deployment Blocked by Tests
If `wp_prepare_deployment` fails due to test failures:
1. Review the test report
2. Fix all critical issues (404s, missing meta tags)
3. Address warnings if possible
4. Re-run comprehensive tests
5. Proceed with deployment only after tests pass

## Security Considerations

- Never commit `.env` files with API keys
- Use environment variables for sensitive data
- Database passwords are environment-specific
- SiteGround SSH keys must be properly configured
- Production credentials should be set on the server, not in code

## MCP Server Commands Reference

### Project Management
- `wp_create_project` - Create new WordPress project
- `wp_list_projects` - List all projects
- `wp_switch_project` - Switch between projects
- `wp_delete_project` - Delete a project

### Docker Management
- `wp_start` - Start containers
- `wp_stop` - Stop containers
- `wp_restart` - Restart containers
- `wp_logs` - View container logs

### Database Management
- `wp_db_dump` - Export database with migration tracking
- `wp_db_diff` - Generate migration script
- `wp_db_import` - Import SQL file
- `wp_db_reset` - Reset database from migrations

### Git Operations
- `wp_git_status` - Check Git status
- `wp_git_commit` - Commit changes
- `wp_prepare_deployment` - Prepare for deployment

### SiteGround Integration
- `wp_siteground_connect` - Connect to SiteGround
- `wp_siteground_deploy` - Deploy via Git
- `wp_siteground_sync` - Pull from production
- `wp_siteground_cache_clear` - Clear cache
- `wp_siteground_info` - Get deployment info

### Testing Tools (NEW)
- `wp_test_all_links` - Test for 404 errors
- `wp_test_seo` - Validate SEO implementation
- `wp_test_comprehensive` - Run all tests
- `wp_test_report` - Generate test report

### Research Tools
- `wp_research_topic` - Basic research
- `wp_research_exhaustive` - Comprehensive research (NEW)
- `wp_validate_research` - Validate data quality (NEW)
- `wp_scrape_site` - Scrape website content
- `wp_find_images` - Download images from Unsplash
- `wp_generate_content` - Generate HTML content
- `wp_import_json` - Import JSON data
- `wp_generate_seo_pages` - Create SEO pages

### WordPress Development
- `wp_install_theme` - Install theme
- `wp_install_plugin` - Install plugin
- `wp_configure` - Update configuration

## Version History

### v1.1.0 (Current)
- Added comprehensive testing framework
- Enhanced research validation
- Integrated Playwright testing capabilities
- Added workflow enforcement
- Improved SEO validation

### v1.0.0
- Initial MCP implementation
- SiteGround Git integration
- Docker-based development
- Basic research tools