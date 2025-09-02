#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Import only essential managers for design phase
import { ProjectManager } from './lib/project-manager.js';
import { WordPressManager } from './lib/wordpress-manager.js';
import { ResearchManager } from './lib/research-manager.js';
import { DockerManager } from './lib/docker-manager.js';

class WordPressDesignServer {
  constructor() {
    // Initialize only essential managers
    this.projectManager = new ProjectManager();
    this.wordpressManager = new WordPressManager();
    this.researchManager = new ResearchManager();
    this.dockerManager = new DockerManager();

    // Initialize MCP server
    this.server = new Server(
      {
        name: 'wp-design-mcp',
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
    // List only essential tools for design phase
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Project Management (Essential)
        {
          name: 'wp_create_project',
          description: 'Create a new WordPress project',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Project name' },
              port: { type: 'number', description: 'Local port' },
            },
            required: ['name', 'port'],
          },
        },
        {
          name: 'wp_list_projects',
          description: 'List all WordPress projects',
          inputSchema: { type: 'object', properties: {} },
        },
        
        // Docker Control (Essential)
        {
          name: 'wp_start',
          description: 'Start WordPress containers',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Project name' },
            },
            required: ['name'],
          },
        },
        {
          name: 'wp_stop',
          description: 'Stop WordPress containers',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Project name' },
            },
            required: ['name'],
          },
        },
        
        // Content & Design Tools (Primary Focus)
        {
          name: 'wp_create_page',
          description: 'Create a WordPress page with content',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Project name' },
              title: { type: 'string', description: 'Page title' },
              content: { type: 'string', description: 'Page content (HTML)' },
              parent: { type: 'string', description: 'Parent page slug (optional)' },
            },
            required: ['name', 'title', 'content'],
          },
        },
        {
          name: 'wp_create_post',
          description: 'Create a blog post',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Project name' },
              title: { type: 'string', description: 'Post title' },
              content: { type: 'string', description: 'Post content (HTML)' },
              category: { type: 'string', description: 'Category name' },
              tags: { type: 'array', items: { type: 'string' }, description: 'Post tags' },
            },
            required: ['name', 'title', 'content'],
          },
        },
        {
          name: 'wp_create_menu',
          description: 'Create a navigation menu',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Project name' },
              menuName: { type: 'string', description: 'Menu name' },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    url: { type: 'string' },
                    order: { type: 'number' },
                  },
                },
              },
            },
            required: ['name', 'menuName', 'items'],
          },
        },
        
        // Theme & Plugin Management
        {
          name: 'wp_install_theme',
          description: 'Install a WordPress theme',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Project name' },
              theme: { type: 'string', description: 'Theme slug or path' },
              activate: { type: 'boolean', description: 'Activate after install' },
            },
            required: ['name', 'theme'],
          },
        },
        {
          name: 'wp_install_plugin',
          description: 'Install a WordPress plugin',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Project name' },
              plugin: { type: 'string', description: 'Plugin slug' },
              activate: { type: 'boolean', description: 'Activate after install' },
            },
            required: ['name', 'plugin'],
          },
        },
        
        // Research & Content Generation
        {
          name: 'wp_research_topic',
          description: 'Research a topic for content ideas',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Project name' },
              topic: { type: 'string', description: 'Topic to research' },
            },
            required: ['name', 'topic'],
          },
        },
        {
          name: 'wp_generate_content',
          description: 'Generate HTML content from data',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Project name' },
              type: { type: 'string', description: 'Content type' },
              data: { type: 'object', description: 'Data for content generation' },
            },
            required: ['name', 'type', 'data'],
          },
        },
        {
          name: 'wp_find_images',
          description: 'Find and download images from Unsplash',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Project name' },
              query: { type: 'string', description: 'Image search query' },
              count: { type: 'number', description: 'Number of images' },
            },
            required: ['name', 'query'],
          },
        },
      ],
    }));

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // Project Management
          case 'wp_create_project':
            return await this.projectManager.createProject(args.name, args.port);
          case 'wp_list_projects':
            return await this.projectManager.listProjects();
            
          // Docker Control
          case 'wp_start':
            return await this.dockerManager.startProject(args.name);
          case 'wp_stop':
            return await this.dockerManager.stopProject(args.name);
            
          // Content Creation
          case 'wp_create_page':
            return await this.wordpressManager.createPage(
              args.name,
              args.title,
              args.content,
              args.parent
            );
          case 'wp_create_post':
            return await this.wordpressManager.createPost(
              args.name,
              args.title,
              args.content,
              args.category,
              args.tags
            );
          case 'wp_create_menu':
            return await this.wordpressManager.createMenu(
              args.name,
              args.menuName,
              args.items
            );
            
          // Theme & Plugins
          case 'wp_install_theme':
            return await this.wordpressManager.installTheme(
              args.name,
              args.theme,
              args.activate
            );
          case 'wp_install_plugin':
            return await this.wordpressManager.installPlugin(
              args.name,
              args.plugin,
              args.activate
            );
            
          // Research & Content
          case 'wp_research_topic':
            return await this.researchManager.researchTopic(args.name, args.topic);
          case 'wp_generate_content':
            return await this.researchManager.generateContent(
              args.name,
              args.type,
              args.data
            );
          case 'wp_find_images':
            return await this.researchManager.findImages(
              args.name,
              args.query,
              args.count || 10
            );
            
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
    console.error('WordPress Design MCP Server running (minimal mode)...');
  }
}

const server = new WordPressDesignServer();
server.run().catch(console.error);