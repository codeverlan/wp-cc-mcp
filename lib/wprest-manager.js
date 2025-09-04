/**
 * WordPress REST API Manager
 * Provides direct REST API access for WordPress management
 */

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs-extra';
import path from 'path';

export class WPRestManager {
  constructor() {
    this.projectsDir = process.env.WP_PROJECTS_DIR || path.join(process.env.HOME, 'projects', 'wp-projects');
    this.credentials = new Map(); // Store credentials per project
  }

  /**
   * Get project URL and credentials
   */
  async getProjectConfig(project) {
    const projectPath = path.join(this.projectsDir, project);
    
    if (!fs.existsSync(projectPath)) {
      throw new Error(`Project ${project} not found`);
    }

    // Try to get port from docker-compose.yml
    const dockerComposePath = path.join(projectPath, 'docker-compose.yml');
    let port = 8080; // default
    
    if (fs.existsSync(dockerComposePath)) {
      const dockerCompose = await fs.readFile(dockerComposePath, 'utf-8');
      const portMatch = dockerCompose.match(/- "(\d+):80"/);
      if (portMatch) {
        port = portMatch[1];
      }
    }

    return {
      url: `http://localhost:${port}`,
      apiUrl: `http://localhost:${port}/wp-json/wp/v2`,
      username: this.credentials.get(project)?.username || 'admin',
      password: this.credentials.get(project)?.password || 'admin'
    };
  }

  /**
   * Set credentials for a project
   */
  setCredentials(project, username, password) {
    this.credentials.set(project, { username, password });
  }

  /**
   * Make authenticated REST API request
   */
  async apiRequest(project, endpoint, options = {}) {
    const config = await this.getProjectConfig(project);
    const url = `${config.apiUrl}${endpoint}`;
    
    // Basic authentication
    const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    
    const defaultHeaders = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Posts Management via REST API
   */
  async createPost(project, data) {
    return this.apiRequest(project, '/posts', {
      method: 'POST',
      body: JSON.stringify({
        title: data.title,
        content: data.content,
        status: data.status || 'draft',
        categories: data.categories || [],
        tags: data.tags || [],
        meta: data.meta || {},
        featured_media: data.featuredMedia || 0
      })
    });
  }

  async updatePost(project, postId, data) {
    return this.apiRequest(project, `/posts/${postId}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getPost(project, postId) {
    return this.apiRequest(project, `/posts/${postId}`);
  }

  async listPosts(project, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.apiRequest(project, `/posts${queryString ? '?' + queryString : ''}`);
  }

  async deletePost(project, postId, force = false) {
    const params = force ? '?force=true' : '';
    return this.apiRequest(project, `/posts/${postId}${params}`, {
      method: 'DELETE'
    });
  }

  /**
   * Pages Management
   */
  async createPage(project, data) {
    return this.apiRequest(project, '/pages', {
      method: 'POST',
      body: JSON.stringify({
        title: data.title,
        content: data.content,
        status: data.status || 'draft',
        parent: data.parent || 0,
        menu_order: data.menuOrder || 0,
        meta: data.meta || {}
      })
    });
  }

  async updatePage(project, pageId, data) {
    return this.apiRequest(project, `/pages/${pageId}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async listPages(project, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.apiRequest(project, `/pages${queryString ? '?' + queryString : ''}`);
  }

  /**
   * Media Management
   */
  async uploadMedia(project, filePath, data = {}) {
    const config = await this.getProjectConfig(project);
    const url = `${config.apiUrl}/media`;
    
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    
    if (data.title) form.append('title', data.title);
    if (data.caption) form.append('caption', data.caption);
    if (data.alt_text) form.append('alt_text', data.alt_text);
    if (data.description) form.append('description', data.description);

    const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        ...form.getHeaders()
      },
      body: form
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Media upload failed: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getMedia(project, mediaId) {
    return this.apiRequest(project, `/media/${mediaId}`);
  }

  async listMedia(project, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.apiRequest(project, `/media${queryString ? '?' + queryString : ''}`);
  }

  async deleteMedia(project, mediaId, force = true) {
    const params = force ? '?force=true' : '';
    return this.apiRequest(project, `/media/${mediaId}${params}`, {
      method: 'DELETE'
    });
  }

  /**
   * Categories Management
   */
  async createCategory(project, data) {
    return this.apiRequest(project, '/categories', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        description: data.description || '',
        slug: data.slug || '',
        parent: data.parent || 0
      })
    });
  }

  async updateCategory(project, categoryId, data) {
    return this.apiRequest(project, `/categories/${categoryId}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async listCategories(project, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.apiRequest(project, `/categories${queryString ? '?' + queryString : ''}`);
  }

  async deleteCategory(project, categoryId, force = false) {
    const params = force ? '?force=true' : '';
    return this.apiRequest(project, `/categories/${categoryId}${params}`, {
      method: 'DELETE'
    });
  }

  /**
   * Tags Management
   */
  async createTag(project, data) {
    return this.apiRequest(project, '/tags', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        description: data.description || '',
        slug: data.slug || ''
      })
    });
  }

  async updateTag(project, tagId, data) {
    return this.apiRequest(project, `/tags/${tagId}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async listTags(project, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.apiRequest(project, `/tags${queryString ? '?' + queryString : ''}`);
  }

  async deleteTag(project, tagId, force = false) {
    const params = force ? '?force=true' : '';
    return this.apiRequest(project, `/tags/${tagId}${params}`, {
      method: 'DELETE'
    });
  }

  /**
   * Comments Management
   */
  async listComments(project, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.apiRequest(project, `/comments${queryString ? '?' + queryString : ''}`);
  }

  async updateComment(project, commentId, data) {
    return this.apiRequest(project, `/comments/${commentId}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async deleteComment(project, commentId, force = false) {
    const params = force ? '?force=true' : '';
    return this.apiRequest(project, `/comments/${commentId}${params}`, {
      method: 'DELETE'
    });
  }

  /**
   * Users Management
   */
  async createUser(project, data) {
    return this.apiRequest(project, '/users', {
      method: 'POST',
      body: JSON.stringify({
        username: data.username,
        email: data.email,
        password: data.password,
        name: data.name || '',
        first_name: data.firstName || '',
        last_name: data.lastName || '',
        roles: data.roles || ['subscriber']
      })
    });
  }

  async updateUser(project, userId, data) {
    return this.apiRequest(project, `/users/${userId}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getUser(project, userId) {
    return this.apiRequest(project, `/users/${userId}`);
  }

  async listUsers(project, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.apiRequest(project, `/users${queryString ? '?' + queryString : ''}`);
  }

  async deleteUser(project, userId, reassign = 1) {
    return this.apiRequest(project, `/users/${userId}?force=true&reassign=${reassign}`, {
      method: 'DELETE'
    });
  }

  /**
   * Custom Post Types
   */
  async getCustomPosts(project, postType, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.apiRequest(project, `/${postType}${queryString ? '?' + queryString : ''}`);
  }

  async createCustomPost(project, postType, data) {
    return this.apiRequest(project, `/${postType}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateCustomPost(project, postType, postId, data) {
    return this.apiRequest(project, `/${postType}/${postId}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async deleteCustomPost(project, postType, postId, force = false) {
    const params = force ? '?force=true' : '';
    return this.apiRequest(project, `/${postType}/${postId}${params}`, {
      method: 'DELETE'
    });
  }

  /**
   * Menus (requires menu plugin)
   */
  async getMenus(project) {
    return this.apiRequest(project, '/menus');
  }

  async getMenuItems(project, menuId) {
    return this.apiRequest(project, `/menus/${menuId}/items`);
  }

  /**
   * Settings
   */
  async getSettings(project) {
    return this.apiRequest(project, '/settings');
  }

  async updateSettings(project, settings) {
    return this.apiRequest(project, '/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  }

  /**
   * Search
   */
  async search(project, query, params = {}) {
    const searchParams = {
      search: query,
      ...params
    };
    const queryString = new URLSearchParams(searchParams).toString();
    return this.apiRequest(project, `/search?${queryString}`);
  }

  /**
   * Batch Operations
   */
  async batch(project, requests) {
    // WordPress doesn't have native batch support in REST API
    // We'll process sequentially but could be parallelized
    const results = [];
    
    for (const request of requests) {
      try {
        const result = await this.apiRequest(project, request.path, {
          method: request.method || 'GET',
          body: request.body ? JSON.stringify(request.body) : undefined
        });
        results.push({ success: true, data: result });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Health Check
   */
  async healthCheck(project) {
    try {
      const config = await this.getProjectConfig(project);
      const response = await fetch(`${config.url}/wp-json`);
      return {
        healthy: response.ok,
        status: response.status,
        apiAvailable: response.ok
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        apiAvailable: false
      };
    }
  }
}

export default WPRestManager;