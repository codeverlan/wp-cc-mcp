#!/usr/bin/env node
/**
 * Natural Language Interface for WordPress MCP
 * 
 * This module allows you to control all MCP functionality through natural language.
 * Simply describe what you want to do, and it will translate to the appropriate MCP commands.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import readline from 'readline';

class NaturalLanguageInterface {
  constructor() {
    this.client = null;
    this.currentProject = null;
    this.commandPatterns = this.initializePatterns();
    this.context = {
      lastPage: null,
      lastPost: null,
      lastPlugin: null,
      lastTheme: null
    };
  }

  initializePatterns() {
    return {
      // Project Management
      createProject: [
        /create (?:a )?(?:new )?(?:wordpress )?project (?:called |named )?["']?([^"']+)["']?(?: on port (\d+))?/i,
        /start (?:a )?(?:new )?(?:site|website) (?:called |named )?["']?([^"']+)["']?/i,
        /make (?:a )?(?:wordpress )?(?:site|website) (?:for |about )?["']?([^"']+)["']?/i,
        /I want to (?:create|build|make) (?:a )?(?:site|website) (?:for |about |called )?["']?([^"']+)["']?/i
      ],
      
      selectProject: [
        /(?:switch to|use|work on|select) (?:project )?["']?([^"']+)["']?/i,
        /(?:open|load) (?:the )?["']?([^"']+)["']? (?:project|site)/i,
        /let'?s work on ["']?([^"']+)["']?/i
      ],
      
      // Content Creation
      createPage: [
        /create (?:a )?(?:new )?page (?:called|titled|named) ["']?([^"']+)["']?(?: with content ["']?([^"']+)["']?)?/i,
        /add (?:a )?(?:new )?page (?:for |about )?["']?([^"']+)["']?/i,
        /make (?:a )?["']?([^"']+)["']? page/i,
        /I (?:want|need) (?:a|an) ["']?([^"']+)["']? page/i
      ],
      
      createPost: [
        /(?:create|write|add) (?:a )?(?:blog )?post (?:about |on |titled |called )?["']?([^"']+)["']?/i,
        /publish (?:a )?(?:blog )?(?:post |article )(?:about |on )?["']?([^"']+)["']?/i,
        /blog about ["']?([^"']+)["']?/i,
        /write (?:about|on) ["']?([^"']+)["']?/i
      ],
      
      // Theme and Plugin Management
      installTheme: [
        /install (?:the )?["']?([^"']+)["']? theme/i,
        /(?:add|use|activate) (?:the )?["']?([^"']+)["']? theme/i,
        /change theme to ["']?([^"']+)["']?/i,
        /I want (?:the )?["']?([^"']+)["']? theme/i
      ],
      
      installPlugin: [
        /install (?:the )?["']?([^"']+)["']? plugin/i,
        /add (?:the )?["']?([^"']+)["']? (?:plugin|functionality)/i,
        /I (?:need|want) ["']?([^"']+)["']?/i,
        /enable ["']?([^"']+)["']?/i
      ],
      
      // Research and Content Generation
      research: [
        /research (?:about |on )?["']?([^"']+)["']?/i,
        /(?:find|get) (?:information|content|ideas) (?:about |on |for )?["']?([^"']+)["']?/i,
        /what (?:should I write|content do I need) (?:about |for )?["']?([^"']+)["']?/i,
        /help me with (?:content for |ideas about )?["']?([^"']+)["']?/i
      ],
      
      findImages: [
        /(?:find|get|download) (?:images?|photos?|pictures?) (?:of |for |about )?["']?([^"']+)["']?/i,
        /I need (?:images?|photos?|pictures?) (?:of |for |about )?["']?([^"']+)["']?/i,
        /add (?:images?|photos?) (?:of |for |about )?["']?([^"']+)["']?/i,
        /search (?:for )?(?:images?|photos?) (?:of |about )?["']?([^"']+)["']?/i
      ],
      
      // Docker Control
      startDocker: [
        /start (?:the )?(?:docker|containers?|site|wordpress)/i,
        /(?:boot|launch|run) (?:the )?(?:site|wordpress|project)/i,
        /turn on (?:the )?(?:site|wordpress)/i,
        /bring (?:the )?(?:site|wordpress) (?:up|online)/i
      ],
      
      stopDocker: [
        /stop (?:the )?(?:docker|containers?|site|wordpress)/i,
        /(?:shut down|shutdown|turn off) (?:the )?(?:site|wordpress|project)/i,
        /bring (?:the )?(?:site|wordpress) (?:down|offline)/i
      ],
      
      // Navigation and Menus
      createMenu: [
        /create (?:a )?(?:navigation )?menu (?:with|containing) (.+)/i,
        /(?:add|make) (?:a )?(?:nav|navigation) (?:menu )?(?:with |containing )?(.+)/i,
        /set up (?:the )?(?:main )?(?:navigation|menu)/i
      ],
      
      // Testing (when enabled)
      testLinks: [
        /test (?:all )?(?:the )?links/i,
        /check (?:for )?(?:broken|dead) links/i,
        /(?:find|check) 404 (?:errors|pages)/i,
        /validate (?:all )?links/i
      ],
      
      testSEO: [
        /(?:test|check|validate) SEO/i,
        /(?:check|test) (?:the )?(?:meta tags|meta data|SEO settings)/i,
        /(?:is|are) (?:the |my )?(?:SEO|meta tags) (?:good|okay|correct)/i
      ],
      
      // Deployment (when enabled)
      deploy: [
        /deploy (?:to )?(?:siteground|production|live)/i,
        /push (?:to )?(?:siteground|production|live)/i,
        /(?:publish|release) (?:the )?(?:site|website)/i,
        /make (?:the )?(?:site|website) live/i
      ],
      
      // Git Operations
      gitCommit: [
        /(?:save|commit|check in) (?:my )?(?:changes|work)/i,
        /(?:git )?commit (?:with message )?["']?([^"']+)?["']?/i,
        /save (?:my )?progress/i
      ],
      
      gitStatus: [
        /(?:show|check) (?:git )?status/i,
        /what(?:'s| is) changed/i,
        /(?:show|list) (?:my )?changes/i
      ]
    };
  }

  parseCommand(input) {
    const normalizedInput = input.toLowerCase().trim();
    
    // Check each pattern category
    for (const [action, patterns] of Object.entries(this.commandPatterns)) {
      for (const pattern of patterns) {
        const match = normalizedInput.match(pattern);
        if (match) {
          return {
            action,
            params: match.slice(1).filter(Boolean)
          };
        }
      }
    }
    
    // Advanced content interpretation
    return this.interpretContent(normalizedInput);
  }

  interpretContent(input) {
    // Detect content creation requests
    if (input.includes('about') || input.includes('contact') || input.includes('services') || 
        input.includes('products') || input.includes('team') || input.includes('faq')) {
      const pageName = this.extractPageName(input);
      return {
        action: 'createPage',
        params: [pageName, this.generatePageContent(pageName)]
      };
    }
    
    // Detect plugin requests by functionality
    const pluginKeywords = {
      'contact form': 'contact-form-7',
      'seo': 'wordpress-seo',
      'security': 'wordfence',
      'backup': 'updraftplus',
      'cache': 'wp-super-cache',
      'gallery': 'nextgen-gallery',
      'social': 'social-icons',
      'analytics': 'google-analytics-for-wordpress',
      'spam': 'akismet',
      'speed': 'wp-optimize',
      'slider': 'smart-slider-3',
      'forms': 'wpforms-lite',
      'shop': 'woocommerce',
      'ecommerce': 'woocommerce',
      'calendar': 'the-events-calendar',
      'events': 'the-events-calendar'
    };
    
    for (const [keyword, plugin] of Object.entries(pluginKeywords)) {
      if (input.includes(keyword)) {
        return {
          action: 'installPlugin',
          params: [plugin]
        };
      }
    }
    
    // Detect theme requests
    const themeKeywords = {
      'blog': 'twentytwentyfour',
      'business': 'astra',
      'portfolio': 'neve',
      'magazine': 'newsup',
      'minimal': 'generatepress',
      'ecommerce': 'storefront',
      'photography': 'photogenic'
    };
    
    for (const [keyword, theme] of Object.entries(themeKeywords)) {
      if (input.includes(keyword)) {
        return {
          action: 'installTheme',
          params: [theme]
        };
      }
    }
    
    return null;
  }

  extractPageName(input) {
    const commonPages = ['about', 'contact', 'services', 'products', 'team', 'faq', 'testimonials', 'portfolio'];
    for (const page of commonPages) {
      if (input.includes(page)) {
        return page.charAt(0).toUpperCase() + page.slice(1);
      }
    }
    return 'New Page';
  }

  generatePageContent(pageName) {
    const templates = {
      'About': `
        <h1>About Us</h1>
        <p>Welcome to our story. We are dedicated to providing exceptional service and value to our community.</p>
        <h2>Our Mission</h2>
        <p>To make a positive impact through innovation and dedication.</p>
        <h2>Our Values</h2>
        <ul>
          <li>Integrity</li>
          <li>Excellence</li>
          <li>Innovation</li>
          <li>Community</li>
        </ul>
      `,
      'Contact': `
        <h1>Contact Us</h1>
        <p>We'd love to hear from you. Get in touch with us using the form below or through our contact information.</p>
        <div class="contact-info">
          <p><strong>Email:</strong> info@example.com</p>
          <p><strong>Phone:</strong> (555) 123-4567</p>
          <p><strong>Address:</strong> 123 Main Street, City, State 12345</p>
        </div>
        [contact-form-7 title="Contact form 1"]
      `,
      'Services': `
        <h1>Our Services</h1>
        <p>We offer a comprehensive range of services to meet your needs.</p>
        <div class="services-grid">
          <div class="service">
            <h3>Service One</h3>
            <p>Professional service with attention to detail.</p>
          </div>
          <div class="service">
            <h3>Service Two</h3>
            <p>Innovative solutions for modern challenges.</p>
          </div>
          <div class="service">
            <h3>Service Three</h3>
            <p>Reliable support when you need it most.</p>
          </div>
        </div>
      `,
      'FAQ': `
        <h1>Frequently Asked Questions</h1>
        <div class="faq-section">
          <h3>What services do you offer?</h3>
          <p>We provide a wide range of professional services tailored to your needs.</p>
          
          <h3>How can I get started?</h3>
          <p>Simply contact us through our contact form or give us a call.</p>
          
          <h3>What are your hours?</h3>
          <p>We're available Monday through Friday, 9 AM to 5 PM.</p>
        </div>
      `
    };
    
    return templates[pageName] || `<h1>${pageName}</h1><p>Content for ${pageName} page.</p>`;
  }

  async executeCommand(parsed) {
    if (!parsed) {
      return "I didn't understand that command. Try saying something like 'create a page called About' or 'install Yoast SEO plugin'.";
    }
    
    const { action, params } = parsed;
    
    try {
      switch (action) {
        case 'createProject':
          const projectName = params[0];
          const port = params[1] || 8080;
          await this.client.callTool({
            name: 'wp_create_project',
            arguments: { name: projectName, port: parseInt(port) }
          });
          this.currentProject = projectName;
          return `Created WordPress project '${projectName}' on port ${port}`;
          
        case 'selectProject':
          this.currentProject = params[0];
          return `Now working on project '${this.currentProject}'`;
          
        case 'createPage':
          if (!this.currentProject) {
            return "Please select a project first (e.g., 'use project parenting-fm')";
          }
          const pageTitle = params[0];
          const pageContent = params[1] || this.generatePageContent(pageTitle);
          await this.client.callTool({
            name: 'wp_create_page',
            arguments: {
              name: this.currentProject,
              title: pageTitle,
              content: pageContent
            }
          });
          this.context.lastPage = pageTitle;
          return `Created page '${pageTitle}'`;
          
        case 'createPost':
          if (!this.currentProject) {
            return "Please select a project first";
          }
          const postTitle = params[0];
          const postContent = this.generateBlogContent(postTitle);
          await this.client.callTool({
            name: 'wp_create_post',
            arguments: {
              name: this.currentProject,
              title: postTitle,
              content: postContent,
              category: 'General'
            }
          });
          this.context.lastPost = postTitle;
          return `Created blog post '${postTitle}'`;
          
        case 'installPlugin':
          if (!this.currentProject) {
            return "Please select a project first";
          }
          const plugin = params[0];
          await this.client.callTool({
            name: 'wp_install_plugin',
            arguments: {
              name: this.currentProject,
              plugin: plugin,
              activate: true
            }
          });
          this.context.lastPlugin = plugin;
          return `Installed and activated plugin '${plugin}'`;
          
        case 'installTheme':
          if (!this.currentProject) {
            return "Please select a project first";
          }
          const theme = params[0];
          await this.client.callTool({
            name: 'wp_install_theme',
            arguments: {
              name: this.currentProject,
              theme: theme,
              activate: true
            }
          });
          this.context.lastTheme = theme;
          return `Installed and activated theme '${theme}'`;
          
        case 'research':
          if (!this.currentProject) {
            return "Please select a project first";
          }
          const topic = params[0];
          const result = await this.client.callTool({
            name: 'wp_research_topic',
            arguments: {
              name: this.currentProject,
              topic: topic
            }
          });
          return `Research complete for '${topic}'. ${result.content[0].text}`;
          
        case 'findImages':
          if (!this.currentProject) {
            return "Please select a project first";
          }
          const query = params[0];
          await this.client.callTool({
            name: 'wp_find_images',
            arguments: {
              name: this.currentProject,
              query: query,
              count: 5
            }
          });
          return `Downloaded 5 images for '${query}'`;
          
        case 'startDocker':
          if (!this.currentProject) {
            return "Please select a project first";
          }
          await this.client.callTool({
            name: 'wp_start',
            arguments: { name: this.currentProject }
          });
          return `Started WordPress containers for '${this.currentProject}'`;
          
        case 'stopDocker':
          if (!this.currentProject) {
            return "Please select a project first";
          }
          await this.client.callTool({
            name: 'wp_stop',
            arguments: { name: this.currentProject }
          });
          return `Stopped WordPress containers for '${this.currentProject}'`;
          
        case 'createMenu':
          if (!this.currentProject) {
            return "Please select a project first";
          }
          // Parse menu items from the params
          const menuItems = this.parseMenuItems(params[0]);
          await this.client.callTool({
            name: 'wp_create_menu',
            arguments: {
              name: this.currentProject,
              menuName: 'Main Menu',
              items: menuItems
            }
          });
          return `Created navigation menu with ${menuItems.length} items`;
          
        case 'gitCommit':
          if (!this.currentProject) {
            return "Please select a project first";
          }
          const message = params[0] || 'Save progress';
          await this.client.callTool({
            name: 'wp_git_commit',
            arguments: {
              name: this.currentProject,
              message: message
            }
          });
          return `Committed changes: ${message}`;
          
        case 'gitStatus':
          if (!this.currentProject) {
            return "Please select a project first";
          }
          const status = await this.client.callTool({
            name: 'wp_git_status',
            arguments: { name: this.currentProject }
          });
          return status.content[0].text;
          
        default:
          return `Action '${action}' is not yet implemented or not available in current phase.`;
      }
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }

  generateBlogContent(title) {
    return `
      <p>This is a blog post about ${title}. Here's what you need to know:</p>
      <h2>Introduction</h2>
      <p>Welcome to our comprehensive guide on ${title}. This topic is important for many reasons.</p>
      <h2>Key Points</h2>
      <ul>
        <li>Important aspect one</li>
        <li>Critical consideration two</li>
        <li>Essential element three</li>
      </ul>
      <h2>Conclusion</h2>
      <p>We hope this information about ${title} has been helpful. Stay tuned for more insights!</p>
    `;
  }

  parseMenuItems(itemsString) {
    // Parse menu items from strings like "home, about, services, contact"
    const items = itemsString.split(',').map(item => item.trim());
    return items.map((item, index) => ({
      title: item.charAt(0).toUpperCase() + item.slice(1),
      url: `/${item.toLowerCase().replace(/\s+/g, '-')}`,
      order: index + 1
    }));
  }

  async connect() {
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['/Users/tyler-lcsw/projects/wp-cc-mcp/index-minimal.js'],
    });

    this.client = new Client({
      name: 'natural-language-client',
      version: '1.0.0',
    }, {
      capabilities: {},
      requestTimeout: 60000
    });

    await this.client.connect(transport);
    console.log('✅ Connected to WordPress MCP Server\n');
  }

  async startInteractive() {
    console.log('🎯 WordPress Natural Language Interface');
    console.log('=========================================');
    console.log('You can now control WordPress using natural language!');
    console.log('\nExample commands:');
    console.log('  • "Create a page called About Us"');
    console.log('  • "Install Yoast SEO plugin"');
    console.log('  • "Write a blog post about healthy eating"');
    console.log('  • "Find images of happy families"');
    console.log('  • "Add a contact form"');
    console.log('  • "Start the website"');
    console.log('  • "Deploy to production" (when in deployment phase)');
    console.log('\nType "help" for more commands or "exit" to quit.\n');

    await this.connect();

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '🌐 WordPress> '
    });

    rl.prompt();

    rl.on('line', async (line) => {
      const input = line.trim();
      
      if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
        console.log('Goodbye!');
        rl.close();
        process.exit(0);
      }
      
      if (input.toLowerCase() === 'help') {
        this.showHelp();
        rl.prompt();
        return;
      }
      
      if (input.toLowerCase() === 'status') {
        console.log(`Current project: ${this.currentProject || 'None selected'}`);
        console.log(`Last page created: ${this.context.lastPage || 'None'}`);
        console.log(`Last post created: ${this.context.lastPost || 'None'}`);
        console.log(`Last plugin installed: ${this.context.lastPlugin || 'None'}`);
        rl.prompt();
        return;
      }
      
      const parsed = this.parseCommand(input);
      const result = await this.executeCommand(parsed);
      console.log(`\n✓ ${result}\n`);
      
      rl.prompt();
    });

    rl.on('close', () => {
      if (this.client) {
        this.client.close();
      }
      process.exit(0);
    });
  }

  showHelp() {
    console.log('\n📚 Natural Language Commands:');
    console.log('\n🏗️  Project Management:');
    console.log('  • Create a new project called [name]');
    console.log('  • Switch to project [name]');
    console.log('  • Start/stop the website');
    
    console.log('\n📄 Content Creation:');
    console.log('  • Create a page called [title]');
    console.log('  • Write a blog post about [topic]');
    console.log('  • Add an about/contact/services page');
    
    console.log('\n🎨 Design & Features:');
    console.log('  • Install [plugin name] plugin');
    console.log('  • Add a contact form');
    console.log('  • Enable SEO/security/caching');
    console.log('  • Change theme to [theme name]');
    
    console.log('\n🔍 Research & Media:');
    console.log('  • Research about [topic]');
    console.log('  • Find images of [subject]');
    console.log('  • Get content ideas for [topic]');
    
    console.log('\n💾 Version Control:');
    console.log('  • Save my changes');
    console.log('  • Show what\'s changed');
    console.log('  • Commit with message [message]');
    
    console.log('\n🚀 Testing & Deployment (when enabled):');
    console.log('  • Test all links');
    console.log('  • Check SEO');
    console.log('  • Deploy to production');
    console.log('  • Push to SiteGround');
    
    console.log('\n💡 Tips:');
    console.log('  • Type "status" to see current context');
    console.log('  • Type "help" to see this menu');
    console.log('  • Type "exit" to quit');
  }
}

// Export for use as module
export default NaturalLanguageInterface;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const nli = new NaturalLanguageInterface();
  nli.startInteractive().catch(console.error);
}