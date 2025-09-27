import keytar from 'keytar';
import { config } from './config-manager.js';
import { logger } from './logger.js';
import crypto from 'crypto';

/**
 * Secure Credentials Manager
 * Handles secure storage and retrieval of sensitive credentials
 */
export class CredentialsManager {
  constructor() {
    this.serviceName = config.get('credentialService');
    this.encryptionKey = this._getEncryptionKey();
  }

  /**
   * Store credentials securely
   * @param {string} project - Project name
   * @param {string} type - Credential type (e.g., 'wp-rest', 'ssh', 'database')
   * @param {Object} credentials - Credential data
   * @returns {Promise<boolean>} Success status
   */
  async storeCredentials(project, type, credentials) {
    try {
      const account = `${project}:${type}`;
      const encryptedData = this._encrypt(JSON.stringify(credentials));
      
      await keytar.setPassword(this.serviceName, account, encryptedData);
      
      logger.info('Credentials stored securely', {
        project,
        type,
        account: account.replace(/:.+$/, ':***') // Mask sensitive parts
      });
      
      return true;
    } catch (error) {
      logger.logError(error, { 
        operation: 'store-credentials',
        project,
        type 
      });
      return false;
    }
  }

  /**
   * Retrieve credentials securely
   * @param {string} project - Project name
   * @param {string} type - Credential type
   * @returns {Promise<Object|null>} Decrypted credentials or null
   */
  async getCredentials(project, type) {
    try {
      const account = `${project}:${type}`;
      const encryptedData = await keytar.getPassword(this.serviceName, account);
      
      if (!encryptedData) {
        logger.debug('No credentials found', { project, type });
        return null;
      }
      
      const decryptedData = this._decrypt(encryptedData);
      const credentials = JSON.parse(decryptedData);
      
      logger.debug('Credentials retrieved', {
        project,
        type,
        hasCredentials: true
      });
      
      return credentials;
    } catch (error) {
      logger.logError(error, {
        operation: 'get-credentials',
        project,
        type
      });
      return null;
    }
  }

  /**
   * Delete credentials
   * @param {string} project - Project name
   * @param {string} type - Credential type
   * @returns {Promise<boolean>} Success status
   */
  async deleteCredentials(project, type) {
    try {
      const account = `${project}:${type}`;
      const deleted = await keytar.deletePassword(this.serviceName, account);
      
      if (deleted) {
        logger.info('Credentials deleted', { project, type });
      } else {
        logger.debug('No credentials to delete', { project, type });
      }
      
      return deleted;
    } catch (error) {
      logger.logError(error, {
        operation: 'delete-credentials',
        project,
        type
      });
      return false;
    }
  }

  /**
   * List all stored credentials for a project
   * @param {string} project - Project name
   * @returns {Promise<Array>} Array of credential types
   */
  async listProjectCredentials(project) {
    try {
      const allCredentials = await keytar.findCredentials(this.serviceName);
      const projectCredentials = allCredentials
        .filter(cred => cred.account.startsWith(`${project}:`))
        .map(cred => ({
          type: cred.account.split(':')[1],
          account: cred.account
        }));
      
      logger.debug('Listed project credentials', {
        project,
        count: projectCredentials.length
      });
      
      return projectCredentials;
    } catch (error) {
      logger.logError(error, {
        operation: 'list-credentials',
        project
      });
      return [];
    }
  }

  /**
   * Store WordPress REST API credentials
   * @param {string} project - Project name
   * @param {string} username - WordPress username
   * @param {string} password - WordPress password or application password
   * @param {string} siteUrl - Optional site URL
   * @returns {Promise<boolean>} Success status
   */
  async storeWpRestCredentials(project, username, password, siteUrl = null) {
    const credentials = {
      username,
      password,
      siteUrl,
      createdAt: new Date().toISOString(),
      type: 'wp-rest'
    };

    return this.storeCredentials(project, 'wp-rest', credentials);
  }

  /**
   * Get WordPress REST API credentials
   * @param {string} project - Project name
   * @returns {Promise<Object|null>} WordPress credentials
   */
  async getWpRestCredentials(project) {
    return this.getCredentials(project, 'wp-rest');
  }

  /**
   * Store SSH credentials for SiteGround deployment
   * @param {string} project - Project name
   * @param {string} sshHost - SSH host
   * @param {string} sshUser - SSH username
   * @param {string} sshKey - SSH private key content or path
   * @param {string} repoPath - Repository path on server
   * @returns {Promise<boolean>} Success status
   */
  async storeSshCredentials(project, sshHost, sshUser, sshKey, repoPath) {
    const credentials = {
      sshHost,
      sshUser,
      sshKey,
      repoPath,
      createdAt: new Date().toISOString(),
      type: 'ssh'
    };

    return this.storeCredentials(project, 'ssh', credentials);
  }

  /**
   * Get SSH credentials
   * @param {string} project - Project name
   * @returns {Promise<Object|null>} SSH credentials
   */
  async getSshCredentials(project) {
    return this.getCredentials(project, 'ssh');
  }

  /**
   * Store database credentials
   * @param {string} project - Project name
   * @param {Object} dbCredentials - Database connection details
   * @returns {Promise<boolean>} Success status
   */
  async storeDatabaseCredentials(project, dbCredentials) {
    const credentials = {
      ...dbCredentials,
      createdAt: new Date().toISOString(),
      type: 'database'
    };

    return this.storeCredentials(project, 'database', credentials);
  }

  /**
   * Get database credentials
   * @param {string} project - Project name
   * @returns {Promise<Object|null>} Database credentials
   */
  async getDatabaseCredentials(project) {
    return this.getCredentials(project, 'database');
  }

  /**
   * Store API key or token
   * @param {string} project - Project name
   * @param {string} service - Service name (e.g., 'github', 'unsplash')
   * @param {string} token - API token
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<boolean>} Success status
   */
  async storeApiToken(project, service, token, metadata = {}) {
    const credentials = {
      service,
      token,
      metadata,
      createdAt: new Date().toISOString(),
      type: 'api-token'
    };

    return this.storeCredentials(project, `api-${service}`, credentials);
  }

  /**
   * Get API token
   * @param {string} project - Project name
   * @param {string} service - Service name
   * @returns {Promise<Object|null>} API token credentials
   */
  async getApiToken(project, service) {
    return this.getCredentials(project, `api-${service}`);
  }

  /**
   * Update existing credentials
   * @param {string} project - Project name
   * @param {string} type - Credential type
   * @param {Object} updates - Updated credential data
   * @returns {Promise<boolean>} Success status
   */
  async updateCredentials(project, type, updates) {
    try {
      const existing = await this.getCredentials(project, type);
      
      if (!existing) {
        logger.warn('Attempted to update non-existent credentials', {
          project,
          type
        });
        return false;
      }

      const updated = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      return this.storeCredentials(project, type, updated);
    } catch (error) {
      logger.logError(error, {
        operation: 'update-credentials',
        project,
        type
      });
      return false;
    }
  }

  /**
   * Check if credentials exist
   * @param {string} project - Project name
   * @param {string} type - Credential type
   * @returns {Promise<boolean>} Whether credentials exist
   */
  async hasCredentials(project, type) {
    try {
      const credentials = await this.getCredentials(project, type);
      return credentials !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear all credentials for a project
   * @param {string} project - Project name
   * @returns {Promise<number>} Number of credentials deleted
   */
  async clearProjectCredentials(project) {
    try {
      const projectCredentials = await this.listProjectCredentials(project);
      let deletedCount = 0;

      for (const cred of projectCredentials) {
        const deleted = await this.deleteCredentials(project, cred.type);
        if (deleted) deletedCount++;
      }

      logger.info('Cleared project credentials', {
        project,
        deletedCount,
        totalFound: projectCredentials.length
      });

      return deletedCount;
    } catch (error) {
      logger.logError(error, {
        operation: 'clear-project-credentials',
        project
      });
      return 0;
    }
  }

  /**
   * Get or generate encryption key
   * @private
   * @returns {string} Encryption key
   */
  _getEncryptionKey() {
    // In a production environment, this should be stored more securely
    // For now, we'll use a combination of system info and a static key
    const systemInfo = process.platform + process.arch + require('os').hostname();
    const hash = crypto.createHash('sha256');
    hash.update(systemInfo + 'wp-cc-mcp-key-2024');
    return hash.digest('hex').slice(0, 32); // 256-bit key
  }

  /**
   * Encrypt sensitive data
   * @private
   * @param {string} data - Data to encrypt
   * @returns {string} Encrypted data
   */
  _encrypt(data) {
    try {
      const algorithm = 'aes-256-gcm';
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(algorithm, this.encryptionKey);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Return IV + AuthTag + Encrypted Data (all hex encoded)
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      logger.logError(error, { operation: 'encrypt-data' });
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   * @private
   * @param {string} encryptedData - Encrypted data to decrypt
   * @returns {string} Decrypted data
   */
  _decrypt(encryptedData) {
    try {
      const algorithm = 'aes-256-gcm';
      const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
      
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      const decipher = crypto.createDecipher(algorithm, this.encryptionKey);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.logError(error, { operation: 'decrypt-data' });
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Test keytar availability
   * @returns {Promise<boolean>} Whether keytar is working
   */
  async testKeytarAvailability() {
    try {
      const testAccount = 'wp-cc-mcp-test';
      const testPassword = 'test-password';
      
      // Try to set and get a test password
      await keytar.setPassword(this.serviceName, testAccount, testPassword);
      const retrieved = await keytar.getPassword(this.serviceName, testAccount);
      await keytar.deletePassword(this.serviceName, testAccount);
      
      return retrieved === testPassword;
    } catch (error) {
      logger.logError(error, { operation: 'test-keytar' });
      return false;
    }
  }
}

// Export singleton instance
export const credentialsManager = new CredentialsManager();