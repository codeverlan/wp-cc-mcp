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
          description: 'Research a topic using Jina AI',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
              query: {
                type: 'string',
                description: 'Research query',
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