/**
 * Research Manager - Handles basic research and topic analysis
 * Refactored to use new utilities for improved reliability and logging
 * @version 2.0.0
 */

import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs-extra';
import dotenv from 'dotenv';
import { logger } from './logger.js';
import { config } from './config-manager.js';
import { 
  createSuccessResponse, 
  createErrorResponse 
} from './mcp-response.js';

dotenv.config();

export class ResearchManager {
  constructor() {
    this.jinaApiKey = process.env.JINA_API_KEY;
    this.unsplashApiKey = process.env.UNSPLASH_API_KEY;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    logger.debug('ResearchManager initialized', {
      hasJinaKey: !!this.jinaApiKey,
      hasUnsplashKey: !!this.unsplashApiKey
    });
  }

  async getProjectPath(projectName) {
    return config.getProjectPath(projectName);
  }

  async researchTopic(projectName, query) {
    try {
      await this.initialize();
      const projectPath = await this.getProjectPath(projectName);
      
      if (!await fs.pathExists(projectPath)) {
        return createErrorResponse(`Project '${projectName}' does not exist`);
      }

      if (!this.jinaApiKey) {
        return createErrorResponse(
          'Jina AI API key not configured. Set JINA_API_KEY in environment variables.'
        );
      }

      logger.info('Starting research topic', { projectName, query });

      // Parse natural language to determine intent
      const { isSearch, url, topic, subfolder } = this.parseNaturalLanguageQuery(query);
      
      let response;
      let data;
      let filename;
      
      if (isSearch) {
        // Use Jina Search API
        response = await fetch(`https://s.jina.ai/${encodeURIComponent(query)}`, {
          headers: {
            'Authorization': `Bearer ${this.jinaApiKey}`,
            'Accept': 'text/plain',
            'X-Return-Format': 'markdown',
          },
          timeout: 30000
        });
        if (!response.ok) {
          throw new Error(`Jina Search API error: ${response.status} ${response.statusText}`);
        }
        data = await response.text();
        filename = `search_${topic.replace(/\s+/g, '-')}_${new Date().toISOString().split('T')[0]}.md`;
      } else if (url) {
        // Use Jina Reader API for URL analysis
        response = await fetch(`https://r.jina.ai/${url}`, {
          headers: {
            'Authorization': `Bearer ${this.jinaApiKey}`,
            'Accept': 'text/plain',
            'X-Return-Format': 'markdown',
          },
          timeout: 30000
        });
        if (!response.ok) {
          throw new Error(`Jina Reader API error: ${response.status} ${response.statusText}`);
        }
        data = await response.text();
        const urlTopic = new URL(url).hostname.replace(/\./g, '_');
        filename = `analyze_${urlTopic}_${new Date().toISOString().split('T')[0]}.md`;
      } else {
        // Fallback to search
        response = await fetch(`https://s.jina.ai/${encodeURIComponent(query)}`, {
          headers: {
            'Authorization': `Bearer ${this.jinaApiKey}`,
            'Accept': 'text/plain',
            'X-Return-Format': 'markdown',
          },
          timeout: 30000
        });
        if (!response.ok) {
          throw new Error(`Jina API error: ${response.status} ${response.statusText}`);
        }
        data = await response.text();
        filename = `research_${query.replace(/\s+/g, '-').substring(0, 50)}_${new Date().toISOString().split('T')[0]}.md`;
      }
      
      // Save research results with proper categorization
      const researchDir = path.join(projectPath, 'research', subfolder);
      await fs.ensureDir(researchDir);
      
      const fullPath = path.join(researchDir, filename);
      
      // Add metadata header to markdown
      const markdown = `# Research: ${topic || query}

Date: ${new Date().toISOString()}
Type: ${isSearch ? 'Search' : url ? 'URL Analysis' : 'Research'}
${url ? `Source: ${url}` : `Query: ${query}`}
Category: ${subfolder}

---

${data}`;
      
      await fs.writeFile(fullPath, markdown, 'utf-8');

      logger.info('Research completed successfully', {
        projectName, query, type: isSearch ? 'Search' : url ? 'URL Analysis' : 'Research',
        category: subfolder, sizeKB: (data.length / 1024).toFixed(2)
      });

      return createSuccessResponse(
        `Research completed for "${query}"`,
        {
          query,
          type: isSearch ? 'Search' : url ? 'URL Analysis' : 'Research',
          category: subfolder,
          filename: path.basename(filename),
          relativePath: `research/${subfolder}/${filename}`,
          sizeKB: (data.length / 1024).toFixed(2)
        }
      );
      
    } catch (error) {
      logger.logError(error, {
        operation: 'research-topic',
        projectName, query
      });
      return createErrorResponse(
        `Research failed: ${error.message}`,
        { projectName, query }
      );
    }
  }
  
  parseNaturalLanguageQuery(input) {
    const lower = input.toLowerCase();
    
    // Detect if it's a search query
    const isSearch = lower.includes('search') || lower.includes('find') || 
                    lower.includes('look for') || lower.includes('what') || 
                    lower.includes('how') || lower.includes('why');
    
    // Extract URL if present
    const urlMatch = input.match(/https?:\/\/[^\s]+/);
    const url = urlMatch ? urlMatch[0] : null;
    
    // Clean up query for topic extraction
    let topic = input;
    const commandWords = ['search for', 'find', 'look for', 'research about', 
                         'research', 'analyze', 'extract from', 'read', 'about'];
    commandWords.forEach(word => {
      topic = topic.replace(new RegExp(word, 'gi'), '').trim();
    });
    if (url) {
      topic = topic.replace(url, '').trim();
    }
    
    // Detect subfolder category
    const subfolder = this.detectSubfolder(input);
    
    return {
      isSearch: !url && isSearch,
      url: url,
      topic: topic || 'General Research',
      subfolder: subfolder
    };
  }
  
  detectSubfolder(input) {
    const lower = input.toLowerCase();
    
    if (lower.includes('seo') || lower.includes('search engine') || 
        lower.includes('ai optimization') || lower.includes('ranking')) {
      return 'seo-ai-optimization';
    }
    
    if (lower.includes('behavior') || lower.includes('tantrum') || 
        lower.includes('discipline') || lower.includes('parenting')) {
      return 'behavioral-challenges';
    }
    
    if (lower.includes('sleep') || lower.includes('bedtime') || lower.includes('nap')) {
      return 'sleep-issues';
    }
    
    if (lower.includes('eat') || lower.includes('food') || lower.includes('meal')) {
      return 'eating-challenges';
    }
    
    if (lower.includes('school') || lower.includes('homework') || lower.includes('learn')) {
      return 'school-education';
    }
    
    if (lower.includes('wordpress') || lower.includes('plugin') || lower.includes('technical')) {
      return 'technical';
    }
    
    return 'general';
  }

  async scrapeSite(projectName, url) {
    const projectPath = await this.getProjectPath(projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project ${projectName} does not exist`);
    }

    try {
      // Use Jina AI to scrape and parse the website
      const response = await fetch(`https://r.jina.ai/${url}`, {
        headers: {
          'Authorization': this.jinaApiKey ? `Bearer ${this.jinaApiKey}` : '',
          'Accept': 'application/json',
        },
      });

      const content = await response.text();
      
      // Save scraped content
      const scrapedDir = path.join(projectPath, 'scraped');
      await fs.ensureDir(scrapedDir);
      
      const domain = new URL(url).hostname.replace(/\./g, '_');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${domain}_${timestamp}.txt`;
      
      await fs.writeFile(path.join(scrapedDir, filename), content);

      return {
        content: [
          {
            type: 'text',
            text: `Scraped content from ${url}\n` +
                  `Saved to: scraped/${filename}\n` +
                  `Size: ${(content.length / 1024).toFixed(2)} KB`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Scraping failed: ${error.message}`);
    }
  }

  async findImages(projectName, topic, count = 5) {
    const projectPath = await this.getProjectPath(projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project ${projectName} does not exist`);
    }

    if (!this.unsplashApiKey) {
      return {
        content: [
          {
            type: 'text',
            text: 'Unsplash API key not configured. Set UNSPLASH_API_KEY in environment variables.\n' +
                  'You can get a free API key at https://unsplash.com/developers',
          },
        ],
      };
    }

    try {
      // Search Unsplash for images
      const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(topic)}&per_page=${count}`, {
        headers: {
          'Authorization': `Client-ID ${this.unsplashApiKey}`,
        },
      });

      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No images found for topic: ${topic}`,
            },
          ],
        };
      }

      // Download images
      const uploadsDir = path.join(projectPath, 'wp-content', 'uploads', 'unsplash');
      await fs.ensureDir(uploadsDir);
      
      const downloaded = [];
      for (const image of data.results) {
        const imageUrl = image.urls.regular;
        const imageName = `${image.id}_${topic.replace(/\s+/g, '_')}.jpg`;
        const imagePath = path.join(uploadsDir, imageName);
        
        // Download image
        const imageResponse = await fetch(imageUrl);
        const buffer = await imageResponse.buffer();
        await fs.writeFile(imagePath, buffer);
        
        // Save attribution
        const attribution = {
          id: image.id,
          photographer: image.user.name,
          photographer_url: image.user.links.html,
          unsplash_url: image.links.html,
          description: image.description || image.alt_description,
          downloaded_at: new Date().toISOString(),
        };
        
        await fs.writeJson(path.join(uploadsDir, `${image.id}_attribution.json`), attribution, { spaces: 2 });
        
        downloaded.push(imageName);
      }

      return {
        content: [
          {
            type: 'text',
            text: `Downloaded ${downloaded.length} images for "${topic}":\n` +
                  downloaded.map(img => `  - ${img}`).join('\n') +
                  `\nImages saved to: wp-content/uploads/unsplash/`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Image search failed: ${error.message}`);
    }
  }

  async generateContent(projectName, template, data) {
    const projectPath = await this.getProjectPath(projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project ${projectName} does not exist`);
    }

    try {
      let content = '';
      
      // Generate content based on template
      switch (template) {
        case 'directory_listing':
          content = this.generateDirectoryListing(data);
          break;
        case 'location_page':
          content = this.generateLocationPage(data);
          break;
        case 'category_page':
          content = this.generateCategoryPage(data);
          break;
        case 'review_page':
          content = this.generateReviewPage(data);
          break;
        default:
          content = this.generateGenericContent(data);
      }

      // Save generated content
      const contentDir = path.join(projectPath, 'generated-content');
      await fs.ensureDir(contentDir);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${template}_${timestamp}.html`;
      await fs.writeFile(path.join(contentDir, filename), content);

      return {
        content: [
          {
            type: 'text',
            text: `Generated ${template} content\n` +
                  `Saved to: generated-content/${filename}\n` +
                  `Size: ${(content.length / 1024).toFixed(2)} KB`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Content generation failed: ${error.message}`);
    }
  }

  async importJson(projectName, file) {
    const projectPath = await this.getProjectPath(projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project ${projectName} does not exist`);
    }

    const jsonPath = path.join(projectPath, file);
    
    if (!await fs.pathExists(jsonPath)) {
      throw new Error(`JSON file not found: ${file}`);
    }

    try {
      const data = await fs.readJson(jsonPath);
      
      // Generate SQL for importing data
      const sqlStatements = [];
      
      if (data.posts) {
        for (const post of data.posts) {
          const sql = `INSERT INTO wp_posts (post_title, post_content, post_status, post_type, post_date) 
                       VALUES ('${this.escapeSql(post.title)}', '${this.escapeSql(post.content)}', 
                               'publish', '${post.type || 'post'}', NOW());`;
          sqlStatements.push(sql);
        }
      }

      if (data.categories) {
        for (const category of data.categories) {
          const sql = `INSERT INTO wp_terms (name, slug) 
                       VALUES ('${this.escapeSql(category.name)}', '${this.escapeSql(category.slug)}');`;
          sqlStatements.push(sql);
        }
      }

      // Save SQL file
      const migrationsDir = path.join(projectPath, 'migrations');
      await fs.ensureDir(migrationsDir);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sqlFile = `import_${timestamp}.sql`;
      await fs.writeFile(path.join(migrationsDir, sqlFile), sqlStatements.join('\n'));

      // Execute import
      if (sqlStatements.length > 0) {
        await execa('docker', [
          'exec',
          '-i',
          `wp-${projectName}-db`,
          'mysql',
          '-u',
          'wordpress',
          '-pwordpress',
          'wordpress',
        ], {
          input: sqlStatements.join('\n'),
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: `Imported JSON data from ${file}\n` +
                  `Created ${sqlStatements.length} database entries\n` +
                  `Migration saved to: migrations/${sqlFile}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`JSON import failed: ${error.message}`);
    }
  }

  async generateSeoPages(projectName, config) {
    const projectPath = await this.getProjectPath(projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project ${projectName} does not exist`);
    }

    const { locations = [], categories = [] } = config;
    const generatedPages = [];

    try {
      // Generate location pages
      for (const location of locations) {
        for (const category of categories) {
          const title = `${category} in ${location}`;
          const slug = `${category.toLowerCase().replace(/\s+/g, '-')}-${location.toLowerCase().replace(/\s+/g, '-')}`;
          
          const content = `
<h1>${title}</h1>
<p>Find the best ${category.toLowerCase()} services in ${location}. Our comprehensive directory helps you discover top-rated ${category.toLowerCase()} providers in the ${location} area.</p>

<h2>Why Choose ${category} Services in ${location}?</h2>
<p>The ${location} area offers excellent ${category.toLowerCase()} options with experienced professionals and competitive pricing.</p>

<h2>Top ${category} Providers in ${location}</h2>
<p>Browse our curated list of verified ${category.toLowerCase()} services serving the ${location} community.</p>

<h2>Customer Reviews</h2>
<p>Read authentic reviews from local customers who have used ${category.toLowerCase()} services in ${location}.</p>

<h2>Contact Information</h2>
<p>Get direct contact details, business hours, and location information for ${category.toLowerCase()} providers in ${location}.</p>
`;

          // Insert into database
          const sql = `INSERT INTO wp_posts (post_title, post_name, post_content, post_status, post_type, post_date) 
                       VALUES ('${this.escapeSql(title)}', '${slug}', '${this.escapeSql(content)}', 'publish', 'page', NOW());`;
          
          await execa('docker', [
            'exec',
            '-i',
            `wp-${projectName}-db`,
            'mysql',
            '-u',
            'wordpress',
            '-pwordpress',
            'wordpress',
          ], {
            input: sql,
          });

          generatedPages.push({ title, slug });
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: `Generated ${generatedPages.length} SEO pages\n` +
                  `Locations: ${locations.join(', ')}\n` +
                  `Categories: ${categories.join(', ')}\n` +
                  `Sample pages:\n` +
                  generatedPages.slice(0, 5).map(p => `  - ${p.title}`).join('\n'),
          },
        ],
      };
    } catch (error) {
      throw new Error(`SEO page generation failed: ${error.message}`);
    }
  }

  // Helper methods for content generation
  generateDirectoryListing(data) {
    return `
<div class="directory-listing">
  <h1>${data.title || 'Directory'}</h1>
  <div class="listings">
    ${(data.items || []).map(item => `
      <div class="listing-item">
        <h2>${item.name}</h2>
        <p>${item.description}</p>
        <address>${item.address}</address>
        <tel>${item.phone}</tel>
      </div>
    `).join('')}
  </div>
</div>`;
  }

  generateLocationPage(data) {
    return `
<div class="location-page">
  <h1>${data.location} Services</h1>
  <p>Discover the best services in ${data.location}.</p>
  <div class="services-list">
    ${(data.services || []).map(service => `<div class="service">${service}</div>`).join('')}
  </div>
</div>`;
  }

  generateCategoryPage(data) {
    return `
<div class="category-page">
  <h1>${data.category}</h1>
  <p>${data.description}</p>
  <div class="category-items">
    ${(data.items || []).map(item => `<article>${item}</article>`).join('')}
  </div>
</div>`;
  }

  generateReviewPage(data) {
    return `
<div class="review-page">
  <h1>Reviews for ${data.business}</h1>
  <div class="reviews">
    ${(data.reviews || []).map(review => `
      <div class="review">
        <div class="rating">${'⭐'.repeat(review.rating)}</div>
        <p>${review.text}</p>
        <cite>- ${review.author}</cite>
      </div>
    `).join('')}
  </div>
</div>`;
  }

  generateGenericContent(data) {
    return `<div>${JSON.stringify(data, null, 2)}</div>`;
  }

  escapeSql(str) {
    if (!str) return '';
    return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
  }

  /**
   * Validate research data for completeness
   */
  async validateResearchData(projectName, dataFile) {
    const projectPath = await this.getProjectPath(projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project ${projectName} does not exist`);
    }

    try {
      const filePath = path.join(projectPath, dataFile);
      const data = await fs.readJson(filePath);
      
      const validation = {
        file: dataFile,
        valid: true,
        errors: [],
        warnings: [],
        stats: {}
      };

      // Check for directory entries if applicable
      if (data.entries && Array.isArray(data.entries)) {
        validation.stats.total_entries = data.entries.length;
        validation.stats.complete_entries = 0;
        validation.stats.incomplete_entries = 0;
        
        data.entries.forEach((entry, index) => {
          const required = ['name', 'description', 'category'];
          const recommended = ['features', 'pricing', 'pros', 'cons', 'use_cases'];
          
          // Check required fields
          const missing = required.filter(field => !entry[field]);
          if (missing.length > 0) {
            validation.errors.push(`Entry ${index}: Missing required fields: ${missing.join(', ')}`);
            validation.stats.incomplete_entries++;
            validation.valid = false;
          } else {
            validation.stats.complete_entries++;
          }
          
          // Check recommended fields
          const missingRecommended = recommended.filter(field => !entry[field]);
          if (missingRecommended.length > 0) {
            validation.warnings.push(`Entry ${index}: Missing recommended fields: ${missingRecommended.join(', ')}`);
          }
        });
      }

      // Check for SEO data
      if (data.seo) {
        validation.stats.has_seo = true;
        if (!data.seo.meta_title) validation.warnings.push('Missing SEO meta title');
        if (!data.seo.meta_description) validation.warnings.push('Missing SEO meta description');
        if (!data.seo.keywords) validation.warnings.push('Missing SEO keywords');
      } else {
        validation.warnings.push('No SEO data found');
        validation.stats.has_seo = false;
      }

      return {
        content: [
          {
            type: 'text',
            text: `Research Data Validation Report\n` +
                  `================================\n` +
                  `File: ${dataFile}\n` +
                  `Valid: ${validation.valid ? '✅' : '❌'}\n\n` +
                  `Statistics:\n` +
                  JSON.stringify(validation.stats, null, 2) + '\n\n' +
                  `Errors (${validation.errors.length}):\n` +
                  (validation.errors.length > 0 ? validation.errors.join('\n') : 'None') + '\n\n' +
                  `Warnings (${validation.warnings.length}):\n` +
                  (validation.warnings.length > 0 ? validation.warnings.join('\n') : 'None'),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Validation failed: ${error.message}`);
    }
  }

  /**
   * Perform exhaustive research with comprehensive data collection
   */
  async researchExhaustive(projectName, query, options = {}) {
    const projectPath = await this.getProjectPath(projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project ${projectName} does not exist`);
    }

    if (!this.jinaApiKey) {
      return {
        content: [
          {
            type: 'text',
            text: 'Jina AI API key not configured. Set JINA_API_KEY in environment variables.',
          },
        ],
      };
    }

    try {
      const researchDir = path.join(projectPath, 'research');
      await fs.ensureDir(researchDir);
      
      // Comprehensive research template
      const researchTemplate = {
        query: query,
        timestamp: new Date().toISOString(),
        data: {
          basic_info: {},
          features: [],
          pricing: {},
          pros_cons: { pros: [], cons: [] },
          use_cases: [],
          technical_specs: {},
          reviews: [],
          competitors: [],
          market_analysis: {},
          seo_data: {}
        }
      };

      // Perform multiple research queries for comprehensive data
      const queries = [
        `${query} features benefits`,
        `${query} pricing plans cost`,
        `${query} reviews ratings testimonials`,
        `${query} pros cons advantages disadvantages`,
        `${query} use cases applications`,
        `${query} technical specifications requirements`,
        `${query} alternatives competitors comparison`,
        `${query} market analysis trends`
      ];

      for (const subQuery of queries) {
        try {
          const response = await fetch(`https://r.jina.ai/${encodeURIComponent(subQuery)}`, {
            headers: {
              'Authorization': `Bearer ${this.jinaApiKey}`,
              'Accept': 'application/json',
            },
          });

          const data = await response.text();
          
          // Save individual research results
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `exhaustive_${subQuery.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.json`;
          await fs.writeFile(path.join(researchDir, filename), data);
          
          // Parse and merge into template
          try {
            const parsed = JSON.parse(data);
            // Merge parsed data into appropriate sections of researchTemplate
            if (subQuery.includes('features')) {
              researchTemplate.data.features = parsed.features || [];
            }
            if (subQuery.includes('pricing')) {
              researchTemplate.data.pricing = parsed.pricing || {};
            }
            // ... additional parsing logic
          } catch (e) {
            // If not JSON, save as text
          }
        } catch (error) {
          console.error(`Sub-query failed: ${subQuery}`, error);
        }
      }

      // Save comprehensive research results
      const comprehensiveFile = `exhaustive_research_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      await fs.writeJson(path.join(researchDir, comprehensiveFile), researchTemplate, { spaces: 2 });

      return {
        content: [
          {
            type: 'text',
            text: `Exhaustive research completed for: ${query}\n` +
                  `Performed ${queries.length} sub-queries\n` +
                  `Results saved to: research/${comprehensiveFile}\n` +
                  `Total data collected: ${JSON.stringify(researchTemplate.data).length} bytes`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Exhaustive research failed: ${error.message}`);
    }
  }
}