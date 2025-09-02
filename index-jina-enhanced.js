#!/usr/bin/env node
/**
 * WordPress MCP Server with Full Jina AI Integration
 * 
 * This server includes ALL Jina AI capabilities for advanced
 * content research, optimization, and semantic search.
 */

import dotenv from 'dotenv';
dotenv.config();

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Import managers
import { ProjectManager } from './lib/project-manager.js';
import { WordPressManager } from './lib/wordpress-manager.js';
import { DockerManager } from './lib/docker-manager.js';
import { EnhancedResearchManager } from './lib/enhanced-research-manager.js';

class WordPressJinaServer {
  constructor() {
    // Initialize managers
    this.projectManager = new ProjectManager();
    this.wordpressManager = new WordPressManager();
    this.dockerManager = new DockerManager();
    this.researchManager = new EnhancedResearchManager();

    // Initialize MCP server
    this.server = new Server(
      {
        name: 'wp-jina-mcp',
        version: '2.0.0',
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
    // List all available tools including new Jina capabilities
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Original tools (kept minimal for context)
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
        
        // NEW: Jina Search Tools
        {
          name: 'jina_search',
          description: 'Grounded web search with citations using Jina Search API',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Project name' },
              query: { type: 'string', description: 'Search query' },
              numResults: { type: 'number', description: 'Number of results (default: 10)' },
              includeImages: { type: 'boolean', description: 'Include image results' },
            },
            required: ['name', 'query'],
          },
        },
        
        // NEW: Jina Semantic Search
        {
          name: 'jina_semantic_search',
          description: 'Find similar content using AI embeddings',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Project name' },
              query: { type: 'string', description: 'Search query' },
              topK: { type: 'number', description: 'Number of results (default: 5)' },
            },
            required: ['name', 'query'],
          },
        },
        
        // NEW: Jina Content Categorization
        {
          name: 'jina_categorize',
          description: 'Automatically categorize content using AI',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Project name' },
              content: { type: 'string', description: 'Content to categorize' },
              categories: {
                type: 'array',
                items: { type: 'string' },
                description: 'Custom categories (optional)',
              },
            },
            required: ['name', 'content'],
          },
        },
        
        // NEW: Jina Content Optimizer
        {
          name: 'jina_optimize_content',
          description: 'Rerank and optimize content order for relevance',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Project name' },
              query: { type: 'string', description: 'Optimization query' },
              documents: {
                type: 'array',
                items: { type: 'string' },
                description: 'Documents to optimize',
              },
            },
            required: ['name', 'query', 'documents'],
          },
        },
        
        // NEW: Jina Content Chunker
        {
          name: 'jina_chunk_content',
          description: 'Intelligently chunk long content for better SEO',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Project name' },
              content: { type: 'string', description: 'Content to chunk' },
              chunkSize: { type: 'number', description: 'Target chunk size' },
            },
            required: ['name', 'content'],
          },
        },
        
        // NEW: Jina Sentiment Analysis
        {
          name: 'jina_analyze_sentiment',
          description: 'Analyze sentiment of comments or reviews',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Project name' },
              texts: {
                type: 'array',
                items: { type: 'string' },
                description: 'Texts to analyze',
              },
            },
            required: ['name', 'texts'],
          },
        },
        
        // NEW: Jina Content Ideas Generator
        {
          name: 'jina_generate_ideas',
          description: 'Generate content ideas using AI-powered research',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Project name' },
              niche: { type: 'string', description: 'Content niche or topic' },
              count: { type: 'number', description: 'Number of ideas' },
            },
            required: ['name', 'niche'],
          },
        },
        
        // NEW: Jina Comprehensive Research
        {
          name: 'jina_comprehensive_research',
          description: 'Deep research combining all Jina AI capabilities',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Project name' },
              topic: { type: 'string', description: 'Research topic' },
            },
            required: ['name', 'topic'],
          },
        },
        
        // NEW: Jina Multi-Modal Search
        {
          name: 'jina_multimodal_search',
          description: 'Search using both text and images',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Project name' },
              query: { type: 'string', description: 'Text query' },
              imagePath: { type: 'string', description: 'Optional image path' },
            },
            required: ['name', 'query'],
          },
        },
        
        // Keep essential WordPress tools
        {
          name: 'wp_create_page',
          description: 'Create a WordPress page',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              title: { type: 'string' },
              content: { type: 'string' },
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
              name: { type: 'string' },
              title: { type: 'string' },
              content: { type: 'string' },
              category: { type: 'string' },
            },
            required: ['name', 'title', 'content'],
          },
        },
      ],
    }));

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // Jina AI Tools
          case 'jina_search':
            return await this.researchManager.searchWeb(
              args.name,
              args.query,
              {
                numResults: args.numResults,
                includeImages: args.includeImages,
              }
            );
            
          case 'jina_semantic_search':
            return await this.researchManager.findSimilarContent(
              args.name,
              args.query,
              { topK: args.topK }
            );
            
          case 'jina_categorize':
            return await this.researchManager.categorizeContent(
              args.name,
              args.content,
              args.categories
            );
            
          case 'jina_optimize_content':
            return await this.researchManager.optimizeContentOrder(
              args.name,
              args.query,
              args.documents
            );
            
          case 'jina_chunk_content':
            return await this.researchManager.chunkContent(
              args.name,
              args.content,
              { chunkSize: args.chunkSize }
            );
            
          case 'jina_analyze_sentiment':
            return await this.researchManager.analyzeSentiment(
              args.name,
              args.texts
            );
            
          case 'jina_generate_ideas':
            return await this.researchManager.generateContentIdeas(
              args.name,
              args.niche,
              args.count
            );
            
          case 'jina_comprehensive_research':
            return await this.researchManager.comprehensiveResearch(
              args.name,
              args.topic
            );
            
          case 'jina_multimodal_search':
            return await this.researchManager.multiModalSearch(
              args.name,
              args.query,
              args.imagePath
            );
            
          // Original WordPress tools
          case 'wp_create_project':
            return await this.projectManager.createProject(args.name, args.port);
            
          case 'wp_create_page':
            return await this.wordpressManager.createPage(
              args.name,
              args.title,
              args.content
            );
            
          case 'wp_create_post':
            return await this.wordpressManager.createPost(
              args.name,
              args.title,
              args.content,
              args.category
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
    console.error('WordPress MCP Server with Full Jina AI Integration running...');
  }
}

const server = new WordPressJinaServer();
server.run().catch(console.error);