#!/usr/bin/env node
/**
 * Natural Language Interface for Jina AI Features
 * 
 * This module extends natural language understanding to include
 * all Jina AI capabilities.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import readline from 'readline';

class JinaNaturalLanguage {
  constructor() {
    this.client = null;
    this.currentProject = 'parenting-fm'; // Default project
    this.jinaPatterns = this.initializeJinaPatterns();
  }

  initializeJinaPatterns() {
    return {
      // Jina Search patterns
      jinaSearch: [
        /(?:search|find|look for|research) (?:on the web for |online for |about )?["']?([^"']+)["']?/i,
        /(?:get|find) (?:current|latest|recent) (?:information|news|updates) (?:about|on) ["']?([^"']+)["']?/i,
        /what(?:'s| is) (?:the latest|new|trending) (?:about|with|in) ["']?([^"']+)["']?/i,
        /(?:grounded|factual|cited) search (?:for |about )?["']?([^"']+)["']?/i,
      ],
      
      // Semantic search patterns
      semanticSearch: [
        /find (?:similar|related) (?:content|posts|articles) (?:to |about )?["']?([^"']+)["']?/i,
        /(?:what|which) (?:posts|content|articles) (?:are |is )?(?:similar to|like) ["']?([^"']+)["']?/i,
        /search (?:existing |my )?content for ["']?([^"']+)["']?/i,
        /(?:semantic|ai|smart) search (?:for )?["']?([^"']+)["']?/i,
      ],
      
      // Content categorization patterns
      categorize: [
        /(?:categorize|classify|tag) (?:this |the )?(?:content|post|article)/i,
        /what (?:category|type) (?:is this|of content is this)/i,
        /(?:auto|automatically) (?:categorize|tag|classify)/i,
        /analyze (?:and )?(?:categorize|classify) (?:this |the )?content/i,
      ],
      
      // Content optimization patterns
      optimizeContent: [
        /(?:optimize|rerank|order|sort) (?:content|results|posts) (?:for |by )?["']?([^"']+)["']?/i,
        /(?:improve|enhance) (?:content |result )?(?:relevance|ranking) (?:for )?["']?([^"']+)["']?/i,
        /make (?:content|results) more relevant (?:to |for )?["']?([^"']+)["']?/i,
      ],
      
      // Content chunking patterns
      chunkContent: [
        /(?:chunk|split|divide|break) (?:this |the )?(?:content|article|post)/i,
        /(?:create|make) (?:smaller |bite-?sized )?chunks/i,
        /(?:segment|partition) (?:the )?content/i,
        /break (?:down|up) (?:long |the )?(?:content|article)/i,
      ],
      
      // Sentiment analysis patterns
      analyzeSentiment: [
        /(?:analyze|check|assess) (?:the )?sentiment/i,
        /(?:is this|are these) (?:positive|negative|neutral)/i,
        /what(?:'s| is) the (?:sentiment|mood|tone)/i,
        /(?:sentiment|emotion|feeling) analysis/i,
      ],
      
      // Content ideas patterns
      generateIdeas: [
        /(?:generate|give me|suggest|find) (?:content )?ideas (?:for |about )?["']?([^"']+)["']?/i,
        /what (?:should|can) I (?:write|blog|post) about (?:in |for )?["']?([^"']+)["']?/i,
        /(?:content|blog|post) (?:ideas|suggestions|topics) (?:for |about )?["']?([^"']+)["']?/i,
        /help me (?:find|with) (?:content |blog )?ideas (?:for )?["']?([^"']+)["']?/i,
      ],
      
      // Comprehensive research patterns
      comprehensiveResearch: [
        /(?:deep|comprehensive|thorough|complete) research (?:on |about )?["']?([^"']+)["']?/i,
        /research everything (?:about |on )?["']?([^"']+)["']?/i,
        /(?:full|complete) (?:analysis|research) (?:of |on )?["']?([^"']+)["']?/i,
        /(?:analyze|investigate) ["']?([^"']+)["']? (?:thoroughly|completely)/i,
      ],
      
      // Multi-modal search patterns
      multiModalSearch: [
        /search (?:with|using) (?:both )?(?:text and image|image and text)/i,
        /(?:visual|image) (?:and text )?search/i,
        /find (?:content |results )?(?:using |with )?(?:this )?image/i,
        /multi-?modal search/i,
      ],
    };
  }

  parseJinaCommand(input) {
    const normalizedInput = input.toLowerCase().trim();
    
    // Check each Jina pattern category
    for (const [action, patterns] of Object.entries(this.jinaPatterns)) {
      for (const pattern of patterns) {
        const match = normalizedInput.match(pattern);
        if (match) {
          return {
            action,
            params: match.slice(1).filter(Boolean),
          };
        }
      }
    }
    
    return null;
  }

  async executeJinaCommand(parsed) {
    if (!parsed) {
      return null;
    }
    
    const { action, params } = parsed;
    
    try {
      switch (action) {
        case 'jinaSearch':
          const query = params[0] || 'latest news';
          const result = await this.client.callTool({
            name: 'jina_search',
            arguments: {
              name: this.currentProject,
              query: query,
              numResults: 10,
            },
          });
          return `Searched for "${query}" and found results with citations.`;
          
        case 'semanticSearch':
          const searchQuery = params[0] || 'similar content';
          await this.client.callTool({
            name: 'jina_semantic_search',
            arguments: {
              name: this.currentProject,
              query: searchQuery,
              topK: 5,
            },
          });
          return `Found similar content matching "${searchQuery}".`;
          
        case 'categorize':
          // Would need to get current content context
          return 'Content categorization requires specifying the content to categorize.';
          
        case 'optimizeContent':
          const optimizeQuery = params[0] || 'relevance';
          return `Content optimization for "${optimizeQuery}" requires documents to optimize.`;
          
        case 'chunkContent':
          return 'Content chunking requires specifying the content to chunk.';
          
        case 'analyzeSentiment':
          return 'Sentiment analysis requires text to analyze.';
          
        case 'generateIdeas':
          const niche = params[0] || 'general';
          await this.client.callTool({
            name: 'jina_generate_ideas',
            arguments: {
              name: this.currentProject,
              niche: niche,
              count: 10,
            },
          });
          return `Generated content ideas for "${niche}".`;
          
        case 'comprehensiveResearch':
          const topic = params[0] || 'trending topics';
          await this.client.callTool({
            name: 'jina_comprehensive_research',
            arguments: {
              name: this.currentProject,
              topic: topic,
            },
          });
          return `Completed comprehensive research on "${topic}".`;
          
        case 'multiModalSearch':
          return 'Multi-modal search requires both text query and image path.';
          
        default:
          return null;
      }
    } catch (error) {
      return `Jina operation failed: ${error.message}`;
    }
  }

  async connect() {
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['/Users/tyler-lcsw/projects/wp-cc-mcp/index-jina-enhanced.js'],
    });

    this.client = new Client({
      name: 'jina-natural-language',
      version: '1.0.0',
    }, {
      capabilities: {},
      requestTimeout: 120000,
    });

    await this.client.connect(transport);
    console.log('✅ Connected to Jina-Enhanced WordPress MCP\n');
  }

  showJinaHelp() {
    console.log('\n🤖 Jina AI Commands:');
    console.log('\n🔍 Web Search:');
    console.log('  • Search online for [topic]');
    console.log('  • Find current information about [subject]');
    console.log('  • What\'s the latest on [topic]');
    
    console.log('\n🧠 Semantic Search:');
    console.log('  • Find similar content to [topic]');
    console.log('  • What posts are like [subject]');
    console.log('  • Search my content for [query]');
    
    console.log('\n📊 Content Analysis:');
    console.log('  • Categorize this content');
    console.log('  • Analyze sentiment');
    console.log('  • What type of content is this');
    
    console.log('\n⚡ Content Optimization:');
    console.log('  • Optimize content for [keyword]');
    console.log('  • Improve relevance for [topic]');
    console.log('  • Chunk this content');
    console.log('  • Break down long article');
    
    console.log('\n💡 Content Generation:');
    console.log('  • Generate ideas for [niche]');
    console.log('  • What should I write about [topic]');
    console.log('  • Content ideas for [subject]');
    
    console.log('\n🔬 Deep Research:');
    console.log('  • Comprehensive research on [topic]');
    console.log('  • Research everything about [subject]');
    console.log('  • Deep analysis of [topic]');
    
    console.log('\n🖼️ Multi-Modal:');
    console.log('  • Search with image and text');
    console.log('  • Visual search');
    console.log('  • Multi-modal search');
  }

  async startInteractive() {
    console.log('🚀 Jina AI Natural Language Interface');
    console.log('=====================================');
    console.log('Access ALL Jina AI capabilities through natural language!');
    console.log('\nType "jina help" for Jina-specific commands');
    console.log('Type "exit" to quit\n');

    await this.connect();

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '🤖 Jina> ',
    });

    rl.prompt();

    rl.on('line', async (line) => {
      const input = line.trim();
      
      if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
        console.log('Goodbye!');
        rl.close();
        process.exit(0);
      }
      
      if (input.toLowerCase() === 'jina help' || input.toLowerCase() === 'help') {
        this.showJinaHelp();
        rl.prompt();
        return;
      }
      
      // Try to parse as Jina command
      const parsed = this.parseJinaCommand(input);
      const result = await this.executeJinaCommand(parsed);
      
      if (result) {
        console.log(`\n✓ ${result}\n`);
      } else {
        console.log('\n❓ Command not recognized. Type "jina help" for available commands.\n');
      }
      
      rl.prompt();
    });

    rl.on('close', () => {
      if (this.client) {
        this.client.close();
      }
      process.exit(0);
    });
  }
}

// Export for use as module
export default JinaNaturalLanguage;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const jnl = new JinaNaturalLanguage();
  jnl.startInteractive().catch(console.error);
}