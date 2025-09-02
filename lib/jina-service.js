/**
 * Comprehensive Jina AI Service Integration
 * 
 * This module provides full access to ALL Jina AI capabilities:
 * - Reader API (r.jina.ai) - Web page to markdown conversion
 * - Search API (s.jina.ai) - Grounded web search with citations
 * - Embeddings API - Text and multi-modal embeddings
 * - Reranker API - Result relevance optimization
 * - Classifier API - Text classification and sentiment analysis
 * - Segmenter API - Document chunking and segmentation
 */

import fetch from 'node-fetch';
import fs from 'fs-extra';
import path from 'path';

export class JinaService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('Jina API key is required. Set JINA_API_KEY in environment.');
    }
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.jina.ai/v1';
  }

  /**
   * Reader API - Convert web pages to clean markdown
   * This is what your MCP currently uses
   */
  async readWebPage(url) {
    try {
      const response = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
          'X-Return-Format': 'markdown',
        },
      });

      if (!response.ok) {
        throw new Error(`Reader API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        content: data.data?.content || data.content || data,
        title: data.data?.title || data.title,
        url: data.data?.url || url,
        description: data.data?.description,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Search API - Grounded web search with citations
   * NEW CAPABILITY: Real-time web search with sources
   */
  async search(query, options = {}) {
    const {
      numResults = 10,
      includeImages = false,
      includeCitations = true,
    } = options;

    try {
      const response = await fetch('https://s.jina.ai/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: query,
          num_results: numResults,
          include_images: includeImages,
          include_citations: includeCitations,
        }),
      });

      if (!response.ok) {
        throw new Error(`Search API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        results: data.results || [],
        citations: data.citations || [],
        images: data.images || [],
        query: query,
        totalResults: data.total || data.results?.length || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Embeddings API - Generate text embeddings for semantic search
   * NEW CAPABILITY: Create vector representations of text
   */
  async createEmbeddings(input, options = {}) {
    const {
      model = 'jina-embeddings-v3',
      taskType = 'retrieval.query', // or 'retrieval.passage', 'text-matching', 'classification', 'separation'
      dimensions = null, // Optional: reduce embedding dimensions
      normalized = true,
    } = options;

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: Array.isArray(input) ? input : [input],
          task: taskType,
          dimensions,
          embedding_type: normalized ? 'float' : 'ubinary',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Embeddings API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return {
        success: true,
        embeddings: data.data.map(d => d.embedding),
        model: data.model,
        usage: data.usage,
        dimensions: data.data[0]?.embedding?.length || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Reranker API - Rerank search results by relevance
   * NEW CAPABILITY: Optimize result ordering
   */
  async rerank(query, documents, options = {}) {
    const {
      model = 'jina-reranker-v2-base-multilingual',
      topN = null, // Return only top N results
      returnDocuments = true,
    } = options;

    try {
      const response = await fetch(`${this.baseUrl}/rerank`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          query,
          documents: documents.map(doc => 
            typeof doc === 'string' ? { text: doc } : doc
          ),
          top_n: topN,
          return_documents: returnDocuments,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Reranker API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return {
        success: true,
        results: data.results,
        model: data.model,
        usage: data.usage,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Classifier API - Classify text into categories
   * NEW CAPABILITY: Content categorization and sentiment analysis
   */
  async classify(input, options = {}) {
    const {
      model = 'jina-clip-v1',
      labels = [], // Custom labels for classification
      taskType = 'text-classification', // or 'sentiment-analysis', 'zero-shot'
    } = options;

    try {
      const response = await fetch(`${this.baseUrl}/classify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: Array.isArray(input) ? input : [input],
          labels: labels.length > 0 ? labels : undefined,
          task: taskType,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Classifier API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return {
        success: true,
        predictions: data.data,
        model: data.model,
        usage: data.usage,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Segmenter API - Chunk documents intelligently
   * NEW CAPABILITY: Smart document segmentation
   */
  async segment(content, options = {}) {
    const {
      model = 'jina-segmenter-v1',
      chunkSize = 1000,
      overlap = 100,
      returnTokens = false,
    } = options;

    try {
      const response = await fetch(`${this.baseUrl}/segment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          content,
          chunk_size: chunkSize,
          overlap,
          return_tokens: returnTokens,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Segmenter API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return {
        success: true,
        chunks: data.chunks,
        model: data.model,
        totalChunks: data.chunks?.length || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Multi-Modal Search - Search with text and images
   * NEW CAPABILITY: Combined text and image search
   */
  async multiModalSearch(query, options = {}) {
    const {
      text = null,
      imageUrl = null,
      imagePath = null,
      numResults = 10,
    } = options;

    try {
      let imageData = null;
      if (imagePath) {
        const imageBuffer = await fs.readFile(imagePath);
        imageData = imageBuffer.toString('base64');
      }

      const searchQuery = {
        text: text || query,
        image_url: imageUrl,
        image_data: imageData,
        num_results: numResults,
      };

      const response = await fetch('https://mm.s.jina.ai/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchQuery),
      });

      if (!response.ok) {
        throw new Error(`Multi-modal search error: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        results: data.results,
        images: data.images,
        totalResults: data.total,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Semantic Search - Find similar content using embeddings
   * NEW CAPABILITY: Content similarity search
   */
  async semanticSearch(query, documents, options = {}) {
    const {
      topK = 5,
      threshold = 0.7,
    } = options;

    try {
      // Get query embedding
      const queryEmbedding = await this.createEmbeddings(query, {
        taskType: 'retrieval.query',
      });

      if (!queryEmbedding.success) {
        throw new Error(queryEmbedding.error);
      }

      // Get document embeddings
      const docEmbeddings = await this.createEmbeddings(documents, {
        taskType: 'retrieval.passage',
      });

      if (!docEmbeddings.success) {
        throw new Error(docEmbeddings.error);
      }

      // Calculate cosine similarity
      const queryVec = queryEmbedding.embeddings[0];
      const similarities = docEmbeddings.embeddings.map((docVec, index) => ({
        document: documents[index],
        score: this.cosineSimilarity(queryVec, docVec),
        index,
      }));

      // Sort by similarity and filter by threshold
      const results = similarities
        .filter(s => s.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

      return {
        success: true,
        results,
        query,
        totalDocuments: documents.length,
        matchedDocuments: results.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Helper: Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vec1, vec2) {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Batch Processing - Process multiple operations efficiently
   */
  async batchProcess(operations) {
    const results = [];
    
    for (const op of operations) {
      try {
        let result;
        switch (op.type) {
          case 'search':
            result = await this.search(op.query, op.options);
            break;
          case 'read':
            result = await this.readWebPage(op.url);
            break;
          case 'embed':
            result = await this.createEmbeddings(op.input, op.options);
            break;
          case 'rerank':
            result = await this.rerank(op.query, op.documents, op.options);
            break;
          case 'classify':
            result = await this.classify(op.input, op.options);
            break;
          default:
            result = { success: false, error: `Unknown operation: ${op.type}` };
        }
        results.push({ ...result, operation: op.type });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error.message, 
          operation: op.type 
        });
      }
    }

    return results;
  }
}

// Export for use in MCP
export default JinaService;