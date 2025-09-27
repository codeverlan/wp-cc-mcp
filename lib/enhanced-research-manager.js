/**
 * Enhanced Research Manager with Full Jina AI Integration
 * 
 * This manager leverages ALL Jina capabilities for comprehensive
 * WordPress content research and optimization.
 */

/**
 * Enhanced Research Manager with Full Jina AI Integration - Refactored
 * Leverages ALL Jina capabilities for comprehensive WordPress content research
 * @version 2.0.0
 */

import JinaService from './jina-service.js';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs-extra';
import dotenv from 'dotenv';
import { logger } from './logger.js';
import { config } from './config-manager.js';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createJsonResponse 
} from './mcp-response.js';

dotenv.config();

export class EnhancedResearchManager {
  constructor() {
    this.jinaApiKey = process.env.JINA_API_KEY;
    this.unsplashApiKey = process.env.UNSPLASH_API_KEY;
    this.isInitialized = false;
    
    if (this.jinaApiKey) {
      this.jina = new JinaService(this.jinaApiKey);
    }
  }

  async initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    logger.debug('EnhancedResearchManager initialized', {
      hasJinaKey: !!this.jinaApiKey,
      hasUnsplashKey: !!this.unsplashApiKey
    });
  }

  async getProjectPath(projectName) {
    return config.getProjectPath(projectName);
  }

  /**
   * Grounded Web Search with Citations
   * Uses Jina Search API for real-time, factual information
   */
  async searchWeb(projectName, query, options = {}) {
    try {
      await this.initialize();
      
      if (!this.jina) {
        return createErrorResponse('Jina API key not configured');
      }

      const projectPath = await this.getProjectPath(projectName);
      
      logger.info('Performing web search with Jina AI', {
        projectName, query, options
      });

      const result = await this.jina.search(query, {
        numResults: options.numResults || 10,
        includeCitations: true,
        includeImages: options.includeImages || false,
      });

      if (result.success) {
        // Save search results
        const searchDir = path.join(projectPath, 'research', 'searches');
        await fs.ensureDir(searchDir);
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `search_${timestamp}.json`;
        await fs.writeJSON(path.join(searchDir, filename), result, { spaces: 2 });

        // Format for WordPress content
        const formattedContent = this.formatSearchResults(result);
        
        logger.info('Web search completed successfully', {
          projectName, query, 
          resultsCount: result.totalResults,
          savedTo: `research/searches/${filename}`
        });
        
        return createSuccessResponse(
          `Found ${result.totalResults} results for "${query}"`,
          {
            query,
            resultsCount: result.totalResults,
            formattedContent,
            savedTo: filename,
            data: result
          }
        );
      }

      return createErrorResponse(`Web search failed: ${result.error}`);
      
    } catch (error) {
      logger.logError(error, {
        operation: 'jina-web-search',
        projectName, query, options
      });
      return createErrorResponse(
        `Web search failed: ${error.message}`,
        { projectName, query, options }
      );
    }
  }

  /**
   * Smart Content Categorization
   * Uses Jina Classifier to categorize content automatically
   */
  async categorizeContent(projectName, content, categories = []) {
    if (!this.jina) {
      throw new Error('Jina API key not configured');
    }

    const defaultCategories = [
      'News', 'Tutorial', 'Review', 'Opinion', 
      'How-to', 'Analysis', 'Interview', 'Case Study'
    ];

    const result = await this.jina.classify(content, {
      labels: categories.length > 0 ? categories : defaultCategories,
      taskType: 'zero-shot',
    });

    if (result.success) {
      const topCategory = result.predictions[0]?.labels?.[0];
      const confidence = result.predictions[0]?.scores?.[0];

      return {
        content: [
          {
            type: 'text',
            text: `Content categorized as: ${topCategory} (confidence: ${(confidence * 100).toFixed(1)}%)`,
          },
        ],
        category: topCategory,
        confidence,
        allCategories: result.predictions[0],
      };
    }

    throw new Error(result.error);
  }

  /**
   * Semantic Content Search
   * Find similar content using embeddings
   */
  async findSimilarContent(projectName, query, options = {}) {
    if (!this.jina) {
      throw new Error('Jina API key not configured');
    }

    const projectPath = path.join(this.projectsDir, projectName);
    
    // Get all existing content
    const contentDir = path.join(projectPath, 'wp-content', 'posts');
    const posts = await this.loadExistingPosts(contentDir);
    
    if (posts.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No existing content found to search.',
          },
        ],
      };
    }

    // Perform semantic search
    const result = await this.jina.semanticSearch(
      query,
      posts.map(p => p.content),
      {
        topK: options.topK || 5,
        threshold: options.threshold || 0.6,
      }
    );

    if (result.success) {
      const matches = result.results.map((r, i) => 
        `${i + 1}. ${posts[r.index].title} (similarity: ${(r.score * 100).toFixed(1)}%)`
      ).join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `Found ${result.results.length} similar posts:\n${matches}`,
          },
        ],
        similarPosts: result.results.map(r => ({
          ...posts[r.index],
          similarity: r.score,
        })),
      };
    }

    throw new Error(result.error);
  }

  /**
   * Optimize Content Ranking
   * Use Jina Reranker to optimize search results or content order
   */
  async optimizeContentOrder(projectName, query, documents) {
    if (!this.jina) {
      throw new Error('Jina API key not configured');
    }

    const result = await this.jina.rerank(query, documents, {
      topN: 10,
      returnDocuments: true,
    });

    if (result.success) {
      const optimizedOrder = result.results.map((r, i) => 
        `${i + 1}. Score: ${r.relevance_score.toFixed(3)} - ${r.document?.text?.substring(0, 100)}...`
      ).join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `Content optimized for query "${query}":\n${optimizedOrder}`,
          },
        ],
        optimizedDocuments: result.results,
      };
    }

    throw new Error(result.error);
  }

  /**
   * Smart Content Chunking
   * Break long content into optimal chunks for better SEO and readability
   */
  async chunkContent(projectName, content, options = {}) {
    if (!this.jina) {
      throw new Error('Jina API key not configured');
    }

    const result = await this.jina.segment(content, {
      chunkSize: options.chunkSize || 500,
      overlap: options.overlap || 50,
    });

    if (result.success) {
      // Save chunks for potential use in creating series posts
      const projectPath = path.join(this.projectsDir, projectName);
      const chunksDir = path.join(projectPath, 'research', 'chunks');
      await fs.ensureDir(chunksDir);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      await fs.writeJSON(
        path.join(chunksDir, `chunks_${timestamp}.json`),
        result.chunks,
        { spaces: 2 }
      );

      return {
        content: [
          {
            type: 'text',
            text: `Content divided into ${result.totalChunks} optimized chunks.`,
          },
        ],
        chunks: result.chunks,
        totalChunks: result.totalChunks,
      };
    }

    throw new Error(result.error);
  }

  /**
   * Multi-Modal Content Search
   * Search using both text and images
   */
  async multiModalSearch(projectName, query, imagePath = null) {
    if (!this.jina) {
      throw new Error('Jina API key not configured');
    }

    const result = await this.jina.multiModalSearch(query, {
      text: query,
      imagePath: imagePath,
      numResults: 10,
    });

    if (result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Found ${result.totalResults} multi-modal results for your search.`,
          },
        ],
        results: result.results,
        images: result.images,
      };
    }

    throw new Error(result.error);
  }

  /**
   * Sentiment Analysis for Comments/Reviews
   * Analyze sentiment of user-generated content
   */
  async analyzeSentiment(projectName, texts) {
    if (!this.jina) {
      throw new Error('Jina API key not configured');
    }

    const result = await this.jina.classify(texts, {
      taskType: 'sentiment-analysis',
    });

    if (result.success) {
      const sentiments = result.predictions.map((p, i) => ({
        text: Array.isArray(texts) ? texts[i] : texts,
        sentiment: p.label,
        confidence: p.score,
      }));

      const summary = {
        positive: sentiments.filter(s => s.sentiment === 'positive').length,
        negative: sentiments.filter(s => s.sentiment === 'negative').length,
        neutral: sentiments.filter(s => s.sentiment === 'neutral').length,
      };

      return {
        content: [
          {
            type: 'text',
            text: `Sentiment Analysis:\nPositive: ${summary.positive}\nNegative: ${summary.negative}\nNeutral: ${summary.neutral}`,
          },
        ],
        sentiments,
        summary,
      };
    }

    throw new Error(result.error);
  }

  /**
   * Generate Content Ideas using Search
   * Use Jina Search to find trending topics and content gaps
   */
  async generateContentIdeas(projectName, niche, count = 10) {
    if (!this.jina) {
      throw new Error('Jina API key not configured');
    }

    // Search for trending topics in the niche
    const trendingQuery = `trending topics ${niche} 2024 2025`;
    const trending = await this.jina.search(trendingQuery, {
      numResults: 20,
    });

    // Search for common questions
    const questionsQuery = `frequently asked questions ${niche}`;
    const questions = await this.jina.search(questionsQuery, {
      numResults: 20,
    });

    // Search for problems/challenges
    const problemsQuery = `common problems challenges ${niche}`;
    const problems = await this.jina.search(problemsQuery, {
      numResults: 20,
    });

    // Combine and deduplicate ideas
    const ideas = new Set();
    
    if (trending.success) {
      trending.results.forEach(r => {
        if (r.title) ideas.add(r.title);
      });
    }
    
    if (questions.success) {
      questions.results.forEach(r => {
        if (r.title) ideas.add(r.title);
      });
    }
    
    if (problems.success) {
      problems.results.forEach(r => {
        if (r.title) ideas.add(r.title);
      });
    }

    const ideaList = Array.from(ideas).slice(0, count);

    return {
      content: [
        {
          type: 'text',
          text: `Generated ${ideaList.length} content ideas for ${niche}:\n\n${ideaList.map((idea, i) => `${i + 1}. ${idea}`).join('\n')}`,
        },
      ],
      ideas: ideaList,
    };
  }

  /**
   * Comprehensive Content Research
   * Combines all Jina capabilities for deep research
   */
  async comprehensiveResearch(projectName, topic, options = {}) {
    if (!this.jina) {
      throw new Error('Jina API key not configured');
    }

    const results = {
      topic,
      timestamp: new Date().toISOString(),
      search: null,
      categories: null,
      sentiment: null,
      relatedContent: null,
    };

    // 1. Search for comprehensive information
    const searchResult = await this.jina.search(topic, {
      numResults: 20,
      includeCitations: true,
    });
    
    if (searchResult.success) {
      results.search = searchResult;
    }

    // 2. Get content from top results
    const topUrls = searchResult.results?.slice(0, 5).map(r => r.url).filter(Boolean) || [];
    const contents = [];
    
    for (const url of topUrls) {
      const pageResult = await this.jina.readWebPage(url);
      if (pageResult.success) {
        contents.push(pageResult.content);
      }
    }

    // 3. Categorize the content
    if (contents.length > 0) {
      const categoryResult = await this.jina.classify(contents[0], {
        taskType: 'zero-shot',
        labels: ['Educational', 'News', 'Tutorial', 'Opinion', 'Review', 'Guide'],
      });
      
      if (categoryResult.success) {
        results.categories = categoryResult.predictions;
      }
    }

    // 4. Generate embeddings for semantic search
    if (contents.length > 0) {
      const embedResult = await this.jina.createEmbeddings(contents, {
        taskType: 'retrieval.passage',
      });
      
      if (embedResult.success) {
        results.embeddings = {
          created: true,
          dimensions: embedResult.dimensions,
          count: embedResult.embeddings.length,
        };
      }
    }

    // Save comprehensive research
    const projectPath = path.join(this.projectsDir, projectName);
    const researchDir = path.join(projectPath, 'research', 'comprehensive');
    await fs.ensureDir(researchDir);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await fs.writeJSON(
      path.join(researchDir, `research_${timestamp}.json`),
      results,
      { spaces: 2 }
    );

    return {
      content: [
        {
          type: 'text',
          text: `Comprehensive research completed for "${topic}":\n` +
                `- Found ${results.search?.totalResults || 0} search results\n` +
                `- Analyzed ${contents.length} web pages\n` +
                `- Generated embeddings for semantic search\n` +
                `- Categorized content types\n` +
                `\nResearch saved to: research/comprehensive/`,
        },
      ],
      data: results,
    };
  }

  // Helper methods
  formatSearchResults(searchResult) {
    if (!searchResult.results || searchResult.results.length === 0) {
      return 'No results found.';
    }

    return searchResult.results.map((r, i) => 
      `${i + 1}. **${r.title}**\n   ${r.description || r.snippet || ''}\n   Source: ${r.url}`
    ).join('\n\n');
  }

  async loadExistingPosts(contentDir) {
    try {
      if (!await fs.pathExists(contentDir)) {
        return [];
      }

      const files = await fs.readdir(contentDir);
      const posts = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const post = await fs.readJSON(path.join(contentDir, file));
          posts.push(post);
        }
      }

      return posts;
    } catch (error) {
      return [];
    }
  }
}

export default EnhancedResearchManager;