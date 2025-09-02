#!/usr/bin/env node
/**
 * AI-Powered WordPress Assistant
 * 
 * This assistant understands complex, multi-step requests and can
 * execute entire workflows from natural language descriptions.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

class WordPressAIAssistant {
  constructor() {
    this.client = null;
    this.workflows = this.initializeWorkflows();
  }

  initializeWorkflows() {
    return {
      // Complete website setup workflows
      'parenting-website': {
        description: 'Complete parenting website with all features',
        steps: [
          { tool: 'wp_create_project', args: { name: 'parenting-fm', port: 8082 } },
          { tool: 'wp_start', args: { name: 'parenting-fm' } },
          { tool: 'wp_install_plugin', args: { name: 'parenting-fm', plugin: 'wordpress-seo', activate: true } },
          { tool: 'wp_install_plugin', args: { name: 'parenting-fm', plugin: 'contact-form-7', activate: true } },
          { tool: 'wp_create_page', args: { 
            name: 'parenting-fm', 
            title: 'Home',
            content: this.getParentingHomeContent()
          }},
          { tool: 'wp_create_page', args: { 
            name: 'parenting-fm', 
            title: 'About',
            content: this.getParentingAboutContent()
          }},
          { tool: 'wp_research_topic', args: { name: 'parenting-fm', topic: 'parenting tips toddlers babies teens' } },
          { tool: 'wp_find_images', args: { name: 'parenting-fm', query: 'happy family children', count: 10 } }
        ]
      },
      
      'blog-website': {
        description: 'Personal blog with essential features',
        steps: [
          { tool: 'wp_install_theme', args: { theme: 'twentytwentyfour', activate: true } },
          { tool: 'wp_install_plugin', args: { plugin: 'wordpress-seo', activate: true } },
          { tool: 'wp_install_plugin', args: { plugin: 'jetpack', activate: true } },
          { tool: 'wp_create_menu', args: { 
            menuName: 'Main Menu',
            items: [
              { title: 'Home', url: '/', order: 1 },
              { title: 'About', url: '/about', order: 2 },
              { title: 'Blog', url: '/blog', order: 3 },
              { title: 'Contact', url: '/contact', order: 4 }
            ]
          }}
        ]
      },
      
      'business-website': {
        description: 'Professional business website',
        steps: [
          { tool: 'wp_install_theme', args: { theme: 'astra', activate: true } },
          { tool: 'wp_install_plugin', args: { plugin: 'wordpress-seo', activate: true } },
          { tool: 'wp_install_plugin', args: { plugin: 'contact-form-7', activate: true } },
          { tool: 'wp_install_plugin', args: { plugin: 'wp-google-maps', activate: true } },
          { tool: 'wp_create_page', args: { title: 'Services', content: this.getServicesContent() } },
          { tool: 'wp_create_page', args: { title: 'Portfolio', content: this.getPortfolioContent() } },
          { tool: 'wp_create_page', args: { title: 'Team', content: this.getTeamContent() } }
        ]
      },
      
      'ecommerce-website': {
        description: 'Online store with WooCommerce',
        steps: [
          { tool: 'wp_install_plugin', args: { plugin: 'woocommerce', activate: true } },
          { tool: 'wp_install_theme', args: { theme: 'storefront', activate: true } },
          { tool: 'wp_install_plugin', args: { plugin: 'stripe', activate: true } },
          { tool: 'wp_create_page', args: { title: 'Shop', content: '[products]' } },
          { tool: 'wp_create_page', args: { title: 'Cart', content: '[woocommerce_cart]' } },
          { tool: 'wp_create_page', args: { title: 'Checkout', content: '[woocommerce_checkout]' } }
        ]
      }
    };
  }

  async interpretRequest(request) {
    const lower = request.toLowerCase();
    
    // Detect website type requests
    if (lower.includes('parenting') || lower.includes('family') || lower.includes('children')) {
      return { workflow: 'parenting-website', customizations: this.extractCustomizations(request) };
    }
    
    if (lower.includes('blog') || lower.includes('personal site')) {
      return { workflow: 'blog-website', customizations: this.extractCustomizations(request) };
    }
    
    if (lower.includes('business') || lower.includes('company') || lower.includes('corporate')) {
      return { workflow: 'business-website', customizations: this.extractCustomizations(request) };
    }
    
    if (lower.includes('shop') || lower.includes('store') || lower.includes('ecommerce') || lower.includes('sell')) {
      return { workflow: 'ecommerce-website', customizations: this.extractCustomizations(request) };
    }
    
    // Detect specific feature requests
    const features = [];
    if (lower.includes('seo')) features.push('seo');
    if (lower.includes('contact') || lower.includes('form')) features.push('contact-form');
    if (lower.includes('gallery') || lower.includes('photos')) features.push('gallery');
    if (lower.includes('social')) features.push('social-media');
    if (lower.includes('newsletter')) features.push('newsletter');
    if (lower.includes('analytics')) features.push('analytics');
    if (lower.includes('security')) features.push('security');
    if (lower.includes('backup')) features.push('backup');
    if (lower.includes('speed') || lower.includes('performance')) features.push('performance');
    
    return { features, customizations: this.extractCustomizations(request) };
  }

  extractCustomizations(request) {
    const customizations = {};
    
    // Extract color preferences
    const colors = ['blue', 'green', 'red', 'purple', 'orange', 'yellow', 'pink', 'black', 'white'];
    for (const color of colors) {
      if (request.toLowerCase().includes(color)) {
        customizations.primaryColor = color;
        break;
      }
    }
    
    // Extract style preferences
    if (request.includes('modern')) customizations.style = 'modern';
    if (request.includes('classic')) customizations.style = 'classic';
    if (request.includes('minimal')) customizations.style = 'minimal';
    if (request.includes('colorful')) customizations.style = 'colorful';
    
    // Extract specific pages mentioned
    const pages = [];
    if (request.includes('about')) pages.push('about');
    if (request.includes('contact')) pages.push('contact');
    if (request.includes('services')) pages.push('services');
    if (request.includes('portfolio')) pages.push('portfolio');
    if (request.includes('team')) pages.push('team');
    if (request.includes('testimonial')) pages.push('testimonials');
    if (request.includes('faq')) pages.push('faq');
    
    if (pages.length > 0) customizations.pages = pages;
    
    return customizations;
  }

  async executeWorkflow(workflowName, projectName) {
    const workflow = this.workflows[workflowName];
    if (!workflow) {
      throw new Error(`Workflow '${workflowName}' not found`);
    }
    
    console.log(`\n🚀 Executing ${workflow.description}...\n`);
    
    for (const step of workflow.steps) {
      // Update project name in args if needed
      if (step.args.name === undefined && projectName) {
        step.args.name = projectName;
      }
      
      console.log(`  ⚡ ${step.tool}: ${step.args.title || step.args.plugin || step.args.theme || ''}`);
      
      try {
        await this.client.callTool({
          name: step.tool,
          arguments: step.args
        });
      } catch (error) {
        console.error(`    ❌ Error: ${error.message}`);
      }
    }
    
    console.log('\n✅ Workflow complete!\n');
  }

  async buildFromDescription(description, projectName) {
    console.log('\n🤖 AI Assistant analyzing your request...\n');
    
    const interpretation = await this.interpretRequest(description);
    
    if (interpretation.workflow) {
      // Execute predefined workflow
      await this.executeWorkflow(interpretation.workflow, projectName);
    } else if (interpretation.features && interpretation.features.length > 0) {
      // Build custom workflow from features
      console.log(`📦 Installing requested features: ${interpretation.features.join(', ')}\n`);
      
      for (const feature of interpretation.features) {
        await this.installFeature(feature, projectName);
      }
    }
    
    // Apply customizations
    if (interpretation.customizations && Object.keys(interpretation.customizations).length > 0) {
      console.log('🎨 Applying customizations...\n');
      await this.applyCustomizations(interpretation.customizations, projectName);
    }
  }

  async installFeature(feature, projectName) {
    const featureMap = {
      'seo': { plugin: 'wordpress-seo', name: 'Yoast SEO' },
      'contact-form': { plugin: 'contact-form-7', name: 'Contact Form 7' },
      'gallery': { plugin: 'nextgen-gallery', name: 'NextGEN Gallery' },
      'social-media': { plugin: 'social-icons', name: 'Social Icons' },
      'newsletter': { plugin: 'mailchimp-for-wp', name: 'Mailchimp' },
      'analytics': { plugin: 'google-analytics-for-wordpress', name: 'Google Analytics' },
      'security': { plugin: 'wordfence', name: 'Wordfence Security' },
      'backup': { plugin: 'updraftplus', name: 'UpdraftPlus' },
      'performance': { plugin: 'wp-optimize', name: 'WP-Optimize' }
    };
    
    const featureInfo = featureMap[feature];
    if (featureInfo) {
      console.log(`  📥 Installing ${featureInfo.name}...`);
      await this.client.callTool({
        name: 'wp_install_plugin',
        arguments: {
          name: projectName,
          plugin: featureInfo.plugin,
          activate: true
        }
      });
    }
  }

  async applyCustomizations(customizations, projectName) {
    // Create requested pages
    if (customizations.pages) {
      for (const page of customizations.pages) {
        console.log(`  📄 Creating ${page} page...`);
        const content = this.getPageContent(page);
        await this.client.callTool({
          name: 'wp_create_page',
          arguments: {
            name: projectName,
            title: page.charAt(0).toUpperCase() + page.slice(1),
            content: content
          }
        });
      }
    }
    
    // Apply style preferences (would need theme customization API)
    if (customizations.style) {
      console.log(`  🎨 Applying ${customizations.style} style...`);
      // This would require theme customization tools
    }
  }

  getPageContent(pageType) {
    const contents = {
      'about': '<h1>About Us</h1><p>Learn more about our story and mission.</p>',
      'contact': '<h1>Contact Us</h1><p>Get in touch with us.</p>[contact-form-7]',
      'services': '<h1>Our Services</h1><p>Discover what we can do for you.</p>',
      'portfolio': '<h1>Portfolio</h1><p>View our recent work and projects.</p>',
      'team': '<h1>Our Team</h1><p>Meet the people behind our success.</p>',
      'testimonials': '<h1>Testimonials</h1><p>What our clients say about us.</p>',
      'faq': '<h1>Frequently Asked Questions</h1><p>Find answers to common questions.</p>'
    };
    
    return contents[pageType] || `<h1>${pageType}</h1><p>Content for ${pageType} page.</p>`;
  }

  getParentingHomeContent() {
    return `
      <div class="hero-section">
        <h1>Welcome to Parenting FM</h1>
        <p>Your trusted resource for parenting advice and support.</p>
      </div>
    `;
  }

  getParentingAboutContent() {
    return `
      <h1>About Parenting FM</h1>
      <p>We're dedicated to helping parents navigate the joys and challenges of raising children.</p>
    `;
  }

  getServicesContent() {
    return `
      <h1>Our Services</h1>
      <div class="services-grid">
        <div class="service">
          <h3>Consulting</h3>
          <p>Expert advice for your business needs.</p>
        </div>
        <div class="service">
          <h3>Development</h3>
          <p>Custom solutions built for you.</p>
        </div>
        <div class="service">
          <h3>Support</h3>
          <p>Ongoing assistance and maintenance.</p>
        </div>
      </div>
    `;
  }

  getPortfolioContent() {
    return '<h1>Portfolio</h1><p>Our recent projects showcase our expertise.</p>';
  }

  getTeamContent() {
    return '<h1>Our Team</h1><p>Meet the professionals who make it all happen.</p>';
  }

  async connect() {
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['/Users/tyler-lcsw/projects/wp-cc-mcp/index-minimal.js'],
    });

    this.client = new Client({
      name: 'ai-assistant',
      version: '1.0.0',
    }, {
      capabilities: {},
      requestTimeout: 120000
    });

    await this.client.connect(transport);
  }

  async run(description, projectName = 'my-website') {
    await this.connect();
    await this.buildFromDescription(description, projectName);
    await this.client.close();
  }
}

// Export for use as module
export default WordPressAIAssistant;

// Run if called directly with command line arguments
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.length < 3) {
    console.log('Usage: node ai-assistant.js "description of website" [project-name]');
    console.log('\nExamples:');
    console.log('  node ai-assistant.js "I want a parenting blog with SEO and contact forms"');
    console.log('  node ai-assistant.js "Build me a business website with portfolio" my-business');
    console.log('  node ai-assistant.js "Create an online store for selling crafts" craft-store');
    process.exit(1);
  }
  
  const description = process.argv[2];
  const projectName = process.argv[3] || 'my-website';
  
  const assistant = new WordPressAIAssistant();
  assistant.run(description, projectName).catch(console.error);
}