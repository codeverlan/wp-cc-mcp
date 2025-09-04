#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Import managers
import { DockerManager } from './lib/docker-manager.js';
import { WordPressManager } from './lib/wordpress-manager.js';
import { DatabaseManager } from './lib/database-manager.js';
import { ProjectManager } from './lib/project-manager.js';
import { GitManager } from './lib/git-manager.js';
import { ResearchManager } from './lib/research-manager.js';
import { SiteGroundManager } from './lib/siteground-manager.js';
import { TestingManager } from './lib/testing-manager.js';
import { WPCLIManager } from './lib/wpcli-manager.js';
import { WPRestManager } from './lib/wprest-manager.js';

class WordPressDevServer {
  constructor() {
    // Initialize managers
    this.dockerManager = new DockerManager();
    this.wordpressManager = new WordPressManager();
    this.databaseManager = new DatabaseManager();
    this.projectManager = new ProjectManager();
    this.gitManager = new GitManager();
    this.researchManager = new ResearchManager();
    this.sitegroundManager = new SiteGroundManager();
    this.testingManager = new TestingManager();
    this.wpcliManager = new WPCLIManager();
    this.wprestManager = new WPRestManager();

    // Initialize MCP server
    this.server = new Server(
      {
        name: 'wp-cc-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Project Management
        {
          name: 'wp_create_project',
          description: 'Create a new WordPress project with Docker and Git',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Project name (alphanumeric and hyphens only)',
              },
              port: {
                type: 'number',
                description: 'Local port for WordPress (e.g., 8081)',
              },
              gitRemote: {
                type: 'string',
                description: 'Optional Git remote URL',
              },
            },
            required: ['name', 'port'],
          },
        },
        {
          name: 'wp_list_projects',
          description: 'List all WordPress projects',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'wp_switch_project',
          description: 'Switch to a different project (stop current, start target)',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Project name to switch to',
              },
            },
            required: ['name'],
          },
        },
        {
          name: 'wp_delete_project',
          description: 'Delete a WordPress project',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Project name to delete',
              },
              deleteFiles: {
                type: 'boolean',
                description: 'Also delete project files (default: false)',
                default: false,
              },
            },
            required: ['name'],
          },
        },

        // Docker Management
        {
          name: 'wp_start',
          description: 'Start Docker containers for a project',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
            },
            required: ['project'],
          },
        },
        {
          name: 'wp_stop',
          description: 'Stop Docker containers for a project',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
            },
            required: ['project'],
          },
        },
        {
          name: 'wp_restart',
          description: 'Restart Docker containers for a project',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
            },
            required: ['project'],
          },
        },
        {
          name: 'wp_logs',
          description: 'View Docker container logs',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
              service: {
                type: 'string',
                description: 'Service name (wordpress or db)',
                enum: ['wordpress', 'db'],
              },
              lines: {
                type: 'number',
                description: 'Number of log lines to show',
                default: 50,
              },
            },
            required: ['project'],
          },
        },

        // Database Management
        {
          name: 'wp_db_dump',
          description: 'Export database to SQL file',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
              message: {
                type: 'string',
                description: 'Migration message/description',
              },
            },
            required: ['project'],
          },
        },
        {
          name: 'wp_db_diff',
          description: 'Generate migration script from database changes',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
            },
            required: ['project'],
          },
        },
        {
          name: 'wp_db_import',
          description: 'Import SQL file to database',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
              file: {
                type: 'string',
                description: 'SQL file path (relative to project)',
              },
            },
            required: ['project', 'file'],
          },
        },
        {
          name: 'wp_db_reset',
          description: 'Reset database by applying all migrations from scratch',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
            },
            required: ['project'],
          },
        },

        // WordPress Development
        {
          name: 'wp_install_theme',
          description: 'Install a WordPress theme',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
              source: {
                type: 'string',
                description: 'Theme source (path or URL)',
              },
              activate: {
                type: 'boolean',
                description: 'Activate theme after installation',
                default: false,
              },
            },
            required: ['project', 'source'],
          },
        },
        {
          name: 'wp_install_plugin',
          description: 'Install a WordPress plugin',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
              source: {
                type: 'string',
                description: 'Plugin source (path, slug, or URL)',
              },
              activate: {
                type: 'boolean',
                description: 'Activate plugin after installation',
                default: false,
              },
            },
            required: ['project', 'source'],
          },
        },
        {
          name: 'wp_configure',
          description: 'Update WordPress configuration',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
              settings: {
                type: 'object',
                description: 'Configuration settings to update',
              },
            },
            required: ['project', 'settings'],
          },
        },

        // Git Operations
        {
          name: 'wp_git_status',
          description: 'Check Git status for a project',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
            },
            required: ['project'],
          },
        },
        {
          name: 'wp_git_commit',
          description: 'Commit changes to Git',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
              message: {
                type: 'string',
                description: 'Commit message',
              },
            },
            required: ['project', 'message'],
          },
        },
        {
          name: 'wp_prepare_deployment',
          description: 'Prepare project for deployment (dump DB, check Git, create checklist)',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
            },
            required: ['project'],
          },
        },

        // Research Tools (Phase 2)
        {
          name: 'wp_research_topic',
          description: 'Research using natural language - searches, analyzes URLs, auto-categorizes. Examples: "search for parenting SEO tips", "analyze https://example.com", "find sleep training methods"',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
              query: {
                type: 'string',
                description: 'Natural language query - can be a search, URL to analyze, or topic. Auto-detects intent and categorizes results.',
              },
            },
            required: ['project', 'query'],
          },
        },
        {
          name: 'wp_scrape_site',
          description: 'Scrape content from a website',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
              url: {
                type: 'string',
                description: 'URL to scrape',
              },
            },
            required: ['project', 'url'],
          },
        },
        {
          name: 'wp_find_images',
          description: 'Find and download images from Unsplash',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
              topic: {
                type: 'string',
                description: 'Image search topic',
              },
              count: {
                type: 'number',
                description: 'Number of images to download',
                default: 5,
              },
            },
            required: ['project', 'topic'],
          },
        },
        {
          name: 'wp_generate_content',
          description: 'Generate content from research data',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
              template: {
                type: 'string',
                description: 'Content template type',
              },
              data: {
                type: 'object',
                description: 'Data for content generation',
              },
            },
            required: ['project', 'template', 'data'],
          },
        },
        {
          name: 'wp_import_json',
          description: 'Import JSON data to create WordPress content',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
              file: {
                type: 'string',
                description: 'JSON file path',
              },
            },
            required: ['project', 'file'],
          },
        },
        {
          name: 'wp_research_exhaustive',
          description: 'Perform exhaustive research with comprehensive data collection',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
              query: {
                type: 'string',
                description: 'Research query for comprehensive data collection',
              },
            },
            required: ['project', 'query'],
          },
        },
        {
          name: 'wp_validate_research',
          description: 'Validate research data for completeness and quality',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
              dataFile: {
                type: 'string',
                description: 'Path to data file to validate (relative to project)',
              },
            },
            required: ['project', 'dataFile'],
          },
        },
        {
          name: 'wp_generate_seo_pages',
          description: 'Generate SEO-optimized location/category pages',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
              config: {
                type: 'object',
                description: 'SEO page generation configuration',
                properties: {
                  locations: {
                    type: 'array',
                    description: 'List of locations',
                  },
                  categories: {
                    type: 'array',
                    description: 'List of categories',
                  },
                },
              },
            },
            required: ['project', 'config'],
          },
        },

        // SiteGround Integration
        {
          name: 'wp_siteground_connect',
          description: 'Connect a project to SiteGround Git repository',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
              sshHost: {
                type: 'string',
                description: 'SiteGround SSH hostname (e.g., eu1.siteground.eu)',
              },
              sshUser: {
                type: 'string',
                description: 'SiteGround SSH username',
              },
              repoPath: {
                type: 'string',
                description: 'Git repository path on SiteGround (e.g., mydomain.com)',
              },
              siteUrl: {
                type: 'string',
                description: 'Optional: Live site URL',
              },
            },
            required: ['project', 'sshHost', 'sshUser', 'repoPath'],
          },
        },
        {
          name: 'wp_siteground_deploy',
          description: 'Deploy project to SiteGround via Git push',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
              branch: {
                type: 'string',
                description: 'Branch to deploy (default: master)',
                default: 'master',
              },
              clearCache: {
                type: 'boolean',
                description: 'Clear SiteGround cache after deployment',
                default: true,
              },
              skipDatabaseDump: {
                type: 'boolean',
                description: 'Skip database dump before deployment',
                default: false,
              },
              message: {
                type: 'string',
                description: 'Optional commit message',
              },
            },
            required: ['project'],
          },
        },
        {
          name: 'wp_siteground_sync',
          description: 'Pull changes from SiteGround repository',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
              branch: {
                type: 'string',
                description: 'Branch to sync (default: master)',
                default: 'master',
              },
            },
            required: ['project'],
          },
        },
        {
          name: 'wp_siteground_cache_clear',
          description: 'Clear SiteGround cache via SSH',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
            },
            required: ['project'],
          },
        },
        {
          name: 'wp_siteground_info',
          description: 'Get SiteGround deployment information for a project',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
            },
            required: ['project'],
          },
        },
        
        // Testing Tools
        {
          name: 'wp_test_all_links',
          description: 'Test all links on the WordPress site for 404 errors',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
            },
            required: ['project'],
          },
        },
        {
          name: 'wp_test_seo',
          description: 'Validate SEO implementation (meta tags, headings, schema)',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
            },
            required: ['project'],
          },
        },
        {
          name: 'wp_test_comprehensive',
          description: 'Run all tests (links, SEO, etc.) and generate report',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
            },
            required: ['project'],
          },
        },
        {
          name: 'wp_test_report',
          description: 'Generate test report from latest test results',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
            },
            required: ['project'],
          },
        },

        // ========== WP-CLI Content Management Tools ==========
        {
          name: 'wp_cli_create_post',
          description: 'Create a WordPress post using WP-CLI',
          inputSchema: {
            type: 'object',
            properties: {
              project: { type: 'string', description: 'Project name' },
              title: { type: 'string', description: 'Post title' },
              content: { type: 'string', description: 'Post content' },
              status: { type: 'string', description: 'Post status (draft, publish)', default: 'draft' },
              category: { type: 'string', description: 'Category name or ID' },
              tags: { type: 'string', description: 'Comma-separated tags' },
              meta: { type: 'object', description: 'Custom meta fields' },
            },
            required: ['project', 'title'],
          },
        },
        {
          name: 'wp_cli_bulk_import_csv',
          description: 'Bulk import posts from CSV file with article data',
          inputSchema: {
            type: 'object',
            properties: {
              project: { type: 'string', description: 'Project name' },
              csvPath: { type: 'string', description: 'Path to CSV file' },
            },
            required: ['project', 'csvPath'],
          },
        },
        {
          name: 'wp_cli_manage_posts',
          description: 'List, update, or delete posts',
          inputSchema: {
            type: 'object',
            properties: {
              project: { type: 'string', description: 'Project name' },
              action: { type: 'string', description: 'Action: list, update, delete' },
              postId: { type: 'number', description: 'Post ID (for update/delete)' },
              data: { type: 'object', description: 'Update data' },
            },
            required: ['project', 'action'],
          },
        },
        {
          name: 'wp_cli_manage_users',
          description: 'Create, update, delete, or list WordPress users',
          inputSchema: {
            type: 'object',
            properties: {
              project: { type: 'string', description: 'Project name' },
              action: { type: 'string', description: 'Action: create, update, delete, list' },
              username: { type: 'string', description: 'Username (for create)' },
              email: { type: 'string', description: 'Email (for create)' },
              userId: { type: 'number', description: 'User ID (for update/delete)' },
              role: { type: 'string', description: 'User role' },
            },
            required: ['project', 'action'],
          },
        },
        {
          name: 'wp_cli_manage_plugins',
          description: 'Install, activate, deactivate, or delete plugins',
          inputSchema: {
            type: 'object',
            properties: {
              project: { type: 'string', description: 'Project name' },
              action: { type: 'string', description: 'Action: install, activate, deactivate, delete, list' },
              plugin: { type: 'string', description: 'Plugin slug or path' },
              activate: { type: 'boolean', description: 'Activate after install', default: true },
            },
            required: ['project', 'action'],
          },
        },
        {
          name: 'wp_cli_manage_themes',
          description: 'Install, activate, or delete themes',
          inputSchema: {
            type: 'object',
            properties: {
              project: { type: 'string', description: 'Project name' },
              action: { type: 'string', description: 'Action: install, activate, delete, list' },
              theme: { type: 'string', description: 'Theme slug or path' },
            },
            required: ['project', 'action'],
          },
        },
        {
          name: 'wp_cli_manage_media',
          description: 'Import media files or regenerate thumbnails',
          inputSchema: {
            type: 'object',
            properties: {
              project: { type: 'string', description: 'Project name' },
              action: { type: 'string', description: 'Action: import, regenerate' },
              filePath: { type: 'string', description: 'Path to media file (for import)' },
              postId: { type: 'number', description: 'Attach to post ID' },
            },
            required: ['project', 'action'],
          },
        },
        {
          name: 'wp_cli_manage_terms',
          description: 'Create, update, or delete categories and tags',
          inputSchema: {
            type: 'object',
            properties: {
              project: { type: 'string', description: 'Project name' },
              action: { type: 'string', description: 'Action: create, update, delete, list' },
              taxonomy: { type: 'string', description: 'Taxonomy: category, post_tag, etc.' },
              term: { type: 'string', description: 'Term name' },
              termId: { type: 'number', description: 'Term ID (for update/delete)' },
            },
            required: ['project', 'action', 'taxonomy'],
          },
        },
        {
          name: 'wp_cli_search_replace',
          description: 'Search and replace in database',
          inputSchema: {
            type: 'object',
            properties: {
              project: { type: 'string', description: 'Project name' },
              search: { type: 'string', description: 'Search string' },
              replace: { type: 'string', description: 'Replace string' },
              dryRun: { type: 'boolean', description: 'Dry run only', default: true },
            },
            required: ['project', 'search', 'replace'],
          },
        },
        {
          name: 'wp_cli_manage_options',
          description: 'Get or set WordPress options',
          inputSchema: {
            type: 'object',
            properties: {
              project: { type: 'string', description: 'Project name' },
              action: { type: 'string', description: 'Action: get, update, delete' },
              option: { type: 'string', description: 'Option name' },
              value: { type: 'string', description: 'Option value (for update)' },
            },
            required: ['project', 'action', 'option'],
          },
        },
        {
          name: 'wp_cli_cache_flush',
          description: 'Flush various caches',
          inputSchema: {
            type: 'object',
            properties: {
              project: { type: 'string', description: 'Project name' },
              type: { type: 'string', description: 'Cache type: all, object, rewrite, transient' },
            },
            required: ['project'],
          },
        },
        {
          name: 'wp_cli_maintenance_mode',
          description: 'Enable or disable maintenance mode',
          inputSchema: {
            type: 'object',
            properties: {
              project: { type: 'string', description: 'Project name' },
              enable: { type: 'boolean', description: 'Enable maintenance mode' },
            },
            required: ['project', 'enable'],
          },
        },
        {
          name: 'wp_cli_run_cron',
          description: 'Run WordPress cron events',
          inputSchema: {
            type: 'object',
            properties: {
              project: { type: 'string', description: 'Project name' },
              hook: { type: 'string', description: 'Specific hook to run (optional)' },
            },
            required: ['project'],
          },
        },
        {
          name: 'wp_cli_custom',
          description: 'Run custom WP-CLI command',
          inputSchema: {
            type: 'object',
            properties: {
              project: { type: 'string', description: 'Project name' },
              command: { type: 'string', description: 'WP-CLI command' },
              args: { type: 'array', description: 'Command arguments', items: { type: 'string' } },
            },
            required: ['project', 'command'],
          },
        },

        // ========== WordPress REST API Tools ==========
        {
          name: 'wp_rest_create_content',
          description: 'Create posts or pages via REST API',
          inputSchema: {
            type: 'object',
            properties: {
              project: { type: 'string', description: 'Project name' },
              type: { type: 'string', description: 'Content type: post or page' },
              title: { type: 'string', description: 'Title' },
              content: { type: 'string', description: 'Content' },
              status: { type: 'string', description: 'Status: draft, publish' },
              meta: { type: 'object', description: 'Meta fields' },
            },
            required: ['project', 'type', 'title'],
          },
        },
        {
          name: 'wp_rest_upload_media',
          description: 'Upload media files via REST API',
          inputSchema: {
            type: 'object',
            properties: {
              project: { type: 'string', description: 'Project name' },
              filePath: { type: 'string', description: 'Path to file' },
              title: { type: 'string', description: 'Media title' },
              altText: { type: 'string', description: 'Alt text' },
            },
            required: ['project', 'filePath'],
          },
        },
        {
          name: 'wp_rest_manage_taxonomies',
          description: 'Manage categories and tags via REST API',
          inputSchema: {
            type: 'object',
            properties: {
              project: { type: 'string', description: 'Project name' },
              type: { type: 'string', description: 'Type: category or tag' },
              action: { type: 'string', description: 'Action: create, update, delete, list' },
              name: { type: 'string', description: 'Term name' },
              id: { type: 'number', description: 'Term ID (for update/delete)' },
            },
            required: ['project', 'type', 'action'],
          },
        },
        {
          name: 'wp_rest_search',
          description: 'Search WordPress content via REST API',
          inputSchema: {
            type: 'object',
            properties: {
              project: { type: 'string', description: 'Project name' },
              query: { type: 'string', description: 'Search query' },
              type: { type: 'string', description: 'Content type to search' },
            },
            required: ['project', 'query'],
          },
        },
        {
          name: 'wp_rest_set_credentials',
          description: 'Set REST API credentials for a project',
          inputSchema: {
            type: 'object',
            properties: {
              project: { type: 'string', description: 'Project name' },
              username: { type: 'string', description: 'WordPress username' },
              password: { type: 'string', description: 'WordPress password' },
            },
            required: ['project', 'username', 'password'],
          },
        },
        {
          name: 'wp_rest_health_check',
          description: 'Check if WordPress REST API is accessible',
          inputSchema: {
            type: 'object',
            properties: {
              project: { type: 'string', description: 'Project name' },
            },
            required: ['project'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // Project Management
          case 'wp_create_project':
            return await this.projectManager.createProject(args.name, args.port, args.gitRemote);
          case 'wp_list_projects':
            return await this.projectManager.listProjects();
          case 'wp_switch_project':
            return await this.projectManager.switchProject(args.name);
          case 'wp_delete_project':
            return await this.projectManager.deleteProject(args.name, args.deleteFiles);

          // Docker Management
          case 'wp_start':
            return await this.dockerManager.startProject(args.project);
          case 'wp_stop':
            return await this.dockerManager.stopProject(args.project);
          case 'wp_restart':
            return await this.dockerManager.restartProject(args.project);
          case 'wp_logs':
            return await this.dockerManager.getLogs(args.project, args.service, args.lines);

          // Database Management
          case 'wp_db_dump':
            return await this.databaseManager.dumpDatabase(args.project, args.message);
          case 'wp_db_diff':
            return await this.databaseManager.generateDiff(args.project);
          case 'wp_db_import':
            return await this.databaseManager.importDatabase(args.project, args.file);
          case 'wp_db_reset':
            return await this.databaseManager.resetDatabase(args.project);

          // WordPress Development
          case 'wp_install_theme':
            return await this.wordpressManager.installTheme(args.project, args.source, args.activate);
          case 'wp_install_plugin':
            return await this.wordpressManager.installPlugin(args.project, args.source, args.activate);
          case 'wp_configure':
            return await this.wordpressManager.configure(args.project, args.settings);

          // Git Operations
          case 'wp_git_status':
            return await this.gitManager.getStatus(args.project);
          case 'wp_git_commit':
            return await this.gitManager.commit(args.project, args.message);
          case 'wp_prepare_deployment':
            return await this.gitManager.prepareDeployment(args.project);

          // SiteGround Integration
          case 'wp_siteground_connect':
            return await this.sitegroundManager.connectProject(
              args.project,
              args.sshHost,
              args.sshUser,
              args.repoPath,
              args.siteUrl
            );
          case 'wp_siteground_deploy':
            return await this.sitegroundManager.deploy(args.project, {
              branch: args.branch,
              clearCache: args.clearCache,
              skipDatabaseDump: args.skipDatabaseDump,
              message: args.message,
            });
          case 'wp_siteground_sync':
            return await this.sitegroundManager.sync(args.project, {
              branch: args.branch,
            });
          case 'wp_siteground_cache_clear':
            return await this.sitegroundManager.clearCache(args.project);
          case 'wp_siteground_info':
            return await this.sitegroundManager.getDeploymentInfo(args.project);

          // Testing Tools
          case 'wp_test_all_links':
            return await this.testingManager.testAllLinks(args.project);
          case 'wp_test_seo':
            return await this.testingManager.validateSEO(args.project);
          case 'wp_test_comprehensive':
            return await this.testingManager.runComprehensiveTests(args.project);
          case 'wp_test_report':
            return await this.testingManager.generateTestReport(args.project);

          // Research Tools
          case 'wp_research_topic':
            return await this.researchManager.researchTopic(args.project, args.query);
          case 'wp_scrape_site':
            return await this.researchManager.scrapeSite(args.project, args.url);
          case 'wp_find_images':
            return await this.researchManager.findImages(args.project, args.topic, args.count);
          case 'wp_generate_content':
            return await this.researchManager.generateContent(args.project, args.template, args.data);
          case 'wp_import_json':
            return await this.researchManager.importJson(args.project, args.file);
          case 'wp_research_exhaustive':
            return await this.researchManager.researchExhaustive(args.project, args.query);
          case 'wp_validate_research':
            return await this.researchManager.validateResearchData(args.project, args.dataFile);
          case 'wp_generate_seo_pages':
            return await this.researchManager.generateSeoPages(args.project, args.config);

          // WP-CLI Tools
          case 'wp_cli_create_post':
            return await this.wpcliManager.createPost(args.project, args);
          case 'wp_cli_bulk_import_csv':
            return await this.wpcliManager.bulkImportCSV(args.project, args.csvPath);
          case 'wp_cli_manage_posts':
            switch(args.action) {
              case 'list':
                return await this.wpcliManager.listPosts(args.project, args);
              case 'update':
                return await this.wpcliManager.updatePost(args.project, args.postId, args.data);
              case 'delete':
                return await this.wpcliManager.deletePost(args.project, args.postId, args.force);
            }
          case 'wp_cli_manage_users':
            switch(args.action) {
              case 'create':
                return await this.wpcliManager.createUser(args.project, args.username, args.email, args);
              case 'update':
                return await this.wpcliManager.updateUser(args.project, args.userId, args);
              case 'delete':
                return await this.wpcliManager.deleteUser(args.project, args.userId, args.reassign);
              case 'list':
                return await this.wpcliManager.listUsers(args.project, args.role);
            }
          case 'wp_cli_manage_plugins':
            switch(args.action) {
              case 'install':
                return await this.wpcliManager.installPlugin(args.project, args.plugin, args.activate);
              case 'activate':
                return await this.wpcliManager.activatePlugin(args.project, args.plugin);
              case 'deactivate':
                return await this.wpcliManager.deactivatePlugin(args.project, args.plugin);
              case 'delete':
                return await this.wpcliManager.deletePlugin(args.project, args.plugin);
              case 'list':
                return await this.wpcliManager.listPlugins(args.project, args.status);
            }
          case 'wp_cli_manage_themes':
            switch(args.action) {
              case 'install':
                return await this.wpcliManager.installTheme(args.project, args.theme);
              case 'activate':
                return await this.wpcliManager.activateTheme(args.project, args.theme);
              case 'delete':
                return await this.wpcliManager.deleteTheme(args.project, args.theme);
              case 'list':
                return await this.wpcliManager.listThemes(args.project);
            }
          case 'wp_cli_manage_media':
            switch(args.action) {
              case 'import':
                return await this.wpcliManager.importMedia(args.project, args.filePath, args);
              case 'regenerate':
                return await this.wpcliManager.regenerateMedia(args.project, args);
            }
          case 'wp_cli_manage_terms':
            switch(args.action) {
              case 'create':
                return await this.wpcliManager.createTerm(args.project, args.taxonomy, args.term, args);
              case 'update':
                return await this.wpcliManager.updateTerm(args.project, args.taxonomy, args.termId, args);
              case 'delete':
                return await this.wpcliManager.deleteTerm(args.project, args.taxonomy, args.termId);
              case 'list':
                return await this.wpcliManager.listTerms(args.project, args.taxonomy);
            }
          case 'wp_cli_search_replace':
            return await this.wpcliManager.searchReplace(args.project, args.search, args.replace, args);
          case 'wp_cli_manage_options':
            switch(args.action) {
              case 'get':
                return await this.wpcliManager.getOption(args.project, args.option);
              case 'update':
                return await this.wpcliManager.updateOption(args.project, args.option, args.value);
              case 'delete':
                return await this.wpcliManager.deleteOption(args.project, args.option);
            }
          case 'wp_cli_cache_flush':
            if (args.type === 'transient') {
              return await this.wpcliManager.clearTransients(args.project, { all: true });
            } else if (args.type === 'rewrite') {
              return await this.wpcliManager.flushRewrite(args.project);
            } else {
              return await this.wpcliManager.flushCache(args.project);
            }
          case 'wp_cli_maintenance_mode':
            return args.enable ? 
              await this.wpcliManager.enableMaintenance(args.project) : 
              await this.wpcliManager.disableMaintenance(args.project);
          case 'wp_cli_run_cron':
            return await this.wpcliManager.runCron(args.project, args.hook);
          case 'wp_cli_custom':
            return await this.wpcliManager.runCustomCommand(args.project, args.command, args.args);

          // REST API Tools  
          case 'wp_rest_create_content':
            return args.type === 'post' ?
              await this.wprestManager.createPost(args.project, args) :
              await this.wprestManager.createPage(args.project, args);
          case 'wp_rest_upload_media':
            return await this.wprestManager.uploadMedia(args.project, args.filePath, {
              title: args.title,
              alt_text: args.altText
            });
          case 'wp_rest_manage_taxonomies':
            const taxType = args.type === 'category' ? 'categories' : 'tags';
            switch(args.action) {
              case 'create':
                return args.type === 'category' ?
                  await this.wprestManager.createCategory(args.project, { name: args.name }) :
                  await this.wprestManager.createTag(args.project, { name: args.name });
              case 'update':
                return args.type === 'category' ?
                  await this.wprestManager.updateCategory(args.project, args.id, { name: args.name }) :
                  await this.wprestManager.updateTag(args.project, args.id, { name: args.name });
              case 'delete':
                return args.type === 'category' ?
                  await this.wprestManager.deleteCategory(args.project, args.id) :
                  await this.wprestManager.deleteTag(args.project, args.id);
              case 'list':
                return args.type === 'category' ?
                  await this.wprestManager.listCategories(args.project) :
                  await this.wprestManager.listTags(args.project);
            }
          case 'wp_rest_search':
            return await this.wprestManager.search(args.project, args.query, { type: args.type });
          case 'wp_rest_set_credentials':
            this.wprestManager.setCredentials(args.project, args.username, args.password);
            return { success: true, message: 'Credentials set successfully' };
          case 'wp_rest_health_check':
            return await this.wprestManager.healthCheck(args.project);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('WordPress MCP Server running...');
  }
}

// Start the server
const server = new WordPressDevServer();
server.run().catch(console.error);