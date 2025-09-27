import yauzl from 'yauzl';
import fs from 'fs-extra';
import path from 'path';
import { logger } from './logger.js';

/**
 * Safe ZIP extraction utility with path traversal protection
 */
export class ZipExtractor {
  constructor() {
    this.maxEntries = 1000; // Prevent ZIP bombs
    this.maxFileSize = 100 * 1024 * 1024; // 100MB per file
    this.maxTotalSize = 500 * 1024 * 1024; // 500MB total extraction
  }

  /**
   * Extract ZIP file safely
   * @param {string} zipPath - Path to ZIP file
   * @param {string} extractTo - Directory to extract to
   * @param {Object} options - Extraction options
   * @returns {Promise<Object>} Extraction result
   */
  async extractZip(zipPath, extractTo, options = {}) {
    const startTime = Date.now();
    
    logger.info('Starting ZIP extraction', {
      zipPath,
      extractTo,
      options
    });

    try {
      // Ensure extraction directory exists
      await fs.ensureDir(extractTo);

      // Get absolute paths for security
      const absoluteZipPath = path.resolve(zipPath);
      const absoluteExtractTo = path.resolve(extractTo);

      // Validate ZIP file exists
      const zipStats = await fs.stat(absoluteZipPath);
      if (!zipStats.isFile()) {
        throw new Error('ZIP path is not a file');
      }

      const result = await this._extractZipFile(
        absoluteZipPath, 
        absoluteExtractTo, 
        options
      );

      const executionTime = Date.now() - startTime;

      logger.info('ZIP extraction completed', {
        zipPath,
        extractTo,
        filesExtracted: result.filesExtracted,
        totalBytes: result.totalBytes,
        executionTime
      });

      return {
        ...result,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.logError(error, {
        operation: 'zip-extraction',
        zipPath,
        extractTo,
        executionTime
      });

      throw error;
    }
  }

  /**
   * List ZIP file contents without extracting
   * @param {string} zipPath - Path to ZIP file
   * @returns {Promise<Array>} Array of file entries
   */
  async listZipContents(zipPath) {
    logger.debug('Listing ZIP contents', { zipPath });

    try {
      const absoluteZipPath = path.resolve(zipPath);
      
      return new Promise((resolve, reject) => {
        yauzl.open(absoluteZipPath, { lazyEntries: true }, (err, zipfile) => {
          if (err) {
            logger.logError(err, { operation: 'list-zip-contents', zipPath });
            reject(err);
            return;
          }

          const entries = [];
          
          zipfile.readEntry();
          
          zipfile.on('entry', (entry) => {
            const entryInfo = {
              fileName: entry.fileName,
              uncompressedSize: entry.uncompressedSize,
              compressedSize: entry.compressedSize,
              isDirectory: /\/$/.test(entry.fileName),
              lastModified: entry.getLastModDate(),
              crc32: entry.crc32,
              compressionMethod: entry.compressionMethod
            };

            entries.push(entryInfo);
            zipfile.readEntry();
          });

          zipfile.on('end', () => {
            logger.debug('ZIP contents listed', {
              zipPath,
              totalEntries: entries.length
            });
            resolve(entries);
          });

          zipfile.on('error', (error) => {
            logger.logError(error, {
              operation: 'list-zip-contents-read',
              zipPath
            });
            reject(error);
          });
        });
      });
    } catch (error) {
      logger.logError(error, {
        operation: 'list-zip-contents-setup',
        zipPath
      });
      throw error;
    }
  }

  /**
   * Validate ZIP file structure for WordPress themes/plugins
   * @param {string} zipPath - Path to ZIP file
   * @param {string} type - 'theme' or 'plugin'
   * @returns {Promise<Object>} Validation result
   */
  async validateWordPressZip(zipPath, type) {
    logger.info('Validating WordPress ZIP', { zipPath, type });

    try {
      const entries = await this.listZipContents(zipPath);
      const validation = {
        isValid: true,
        errors: [],
        warnings: [],
        metadata: {
          type,
          entries: entries.length,
          hasMainDirectory: false,
          mainFiles: [],
          totalSize: entries.reduce((sum, entry) => sum + entry.uncompressedSize, 0)
        }
      };

      // Check for main directory
      const rootDirectories = entries
        .filter(entry => entry.isDirectory && !entry.fileName.includes('/'))
        .map(entry => entry.fileName.replace('/', ''));

      if (rootDirectories.length === 1) {
        validation.metadata.hasMainDirectory = true;
        validation.metadata.mainDirectory = rootDirectories[0];
      } else if (rootDirectories.length > 1) {
        validation.warnings.push('Multiple root directories found');
      }

      // Validate based on type
      if (type === 'theme') {
        const requiredFiles = ['style.css', 'index.php'];
        const foundFiles = [];

        for (const requiredFile of requiredFiles) {
          const found = entries.some(entry => 
            entry.fileName.endsWith(requiredFile) && 
            !entry.isDirectory
          );
          
          if (found) {
            foundFiles.push(requiredFile);
          } else {
            validation.errors.push(`Required theme file missing: ${requiredFile}`);
            validation.isValid = false;
          }
        }

        validation.metadata.mainFiles = foundFiles;

        // Check for style.css header
        const styleCssEntry = entries.find(entry => 
          entry.fileName.endsWith('style.css') && !entry.isDirectory
        );

        if (styleCssEntry && styleCssEntry.uncompressedSize > 0) {
          // We could extract just the style.css to validate the header,
          // but for now we'll assume it's valid if it exists
          validation.metadata.hasStyleHeader = true;
        }

      } else if (type === 'plugin') {
        // For plugins, look for .php files with plugin headers
        const phpFiles = entries.filter(entry => 
          entry.fileName.endsWith('.php') && 
          !entry.isDirectory &&
          !entry.fileName.includes('/')  // Root level PHP files
        );

        if (phpFiles.length === 0) {
          validation.errors.push('No PHP files found in plugin root');
          validation.isValid = false;
        } else {
          validation.metadata.mainFiles = phpFiles.map(file => 
            path.basename(file.fileName)
          );
        }
      }

      // Check for suspicious files
      const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif'];
      const suspiciousFiles = entries.filter(entry => 
        suspiciousExtensions.some(ext => entry.fileName.toLowerCase().endsWith(ext))
      );

      if (suspiciousFiles.length > 0) {
        validation.warnings.push(
          `Suspicious files found: ${suspiciousFiles.map(f => f.fileName).join(', ')}`
        );
      }

      // Check total size
      if (validation.metadata.totalSize > this.maxTotalSize) {
        validation.errors.push('ZIP file is too large for extraction');
        validation.isValid = false;
      }

      logger.info('WordPress ZIP validation completed', {
        zipPath,
        type,
        isValid: validation.isValid,
        errors: validation.errors.length,
        warnings: validation.warnings.length
      });

      return validation;

    } catch (error) {
      logger.logError(error, {
        operation: 'validate-wordpress-zip',
        zipPath,
        type
      });
      throw error;
    }
  }

  /**
   * Extract ZIP file with safety checks
   * @private
   */
  async _extractZipFile(zipPath, extractTo, options) {
    const {
      overwrite = false,
      createDirectories = true,
      filterFunction = null,
      progressCallback = null
    } = options;

    return new Promise((resolve, reject) => {
      yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          reject(err);
          return;
        }

        let filesExtracted = 0;
        let totalBytes = 0;
        let processedEntries = 0;
        const extractedFiles = [];

        zipfile.readEntry();

        zipfile.on('entry', async (entry) => {
          processedEntries++;

          try {
            // Security: Validate entry name
            if (!this._isValidEntryName(entry.fileName)) {
              logger.warn('Skipping invalid entry', { fileName: entry.fileName });
              zipfile.readEntry();
              return;
            }

            // Check limits
            if (processedEntries > this.maxEntries) {
              reject(new Error('ZIP contains too many entries (potential ZIP bomb)'));
              return;
            }

            if (entry.uncompressedSize > this.maxFileSize) {
              logger.warn('Skipping large file', { 
                fileName: entry.fileName, 
                size: entry.uncompressedSize 
              });
              zipfile.readEntry();
              return;
            }

            if (totalBytes + entry.uncompressedSize > this.maxTotalSize) {
              reject(new Error('ZIP extraction would exceed size limit'));
              return;
            }

            // Apply filter if provided
            if (filterFunction && !filterFunction(entry)) {
              zipfile.readEntry();
              return;
            }

            const fullPath = path.resolve(extractTo, entry.fileName);
            
            // Security: Ensure path is within extraction directory
            if (!fullPath.startsWith(extractTo)) {
              logger.warn('Skipping path traversal attempt', { 
                fileName: entry.fileName,
                fullPath 
              });
              zipfile.readEntry();
              return;
            }

            if (/\/$/.test(entry.fileName)) {
              // Directory entry
              if (createDirectories) {
                await fs.ensureDir(fullPath);
              }
              zipfile.readEntry();
            } else {
              // File entry
              const directory = path.dirname(fullPath);
              
              if (createDirectories) {
                await fs.ensureDir(directory);
              }

              // Check if file exists and handle overwrite
              const exists = await fs.pathExists(fullPath);
              if (exists && !overwrite) {
                logger.debug('Skipping existing file', { fileName: entry.fileName });
                zipfile.readEntry();
                return;
              }

              zipfile.openReadStream(entry, (err, readStream) => {
                if (err) {
                  logger.logError(err, {
                    operation: 'open-zip-entry',
                    fileName: entry.fileName
                  });
                  zipfile.readEntry();
                  return;
                }

                const writeStream = fs.createWriteStream(fullPath);
                let extractedBytes = 0;

                readStream.on('data', (chunk) => {
                  extractedBytes += chunk.length;
                });

                readStream.on('end', () => {
                  filesExtracted++;
                  totalBytes += extractedBytes;
                  extractedFiles.push({
                    fileName: entry.fileName,
                    path: fullPath,
                    size: extractedBytes
                  });

                  if (progressCallback) {
                    progressCallback({
                      filesExtracted,
                      currentFile: entry.fileName,
                      totalBytes: extractedBytes
                    });
                  }

                  zipfile.readEntry();
                });

                readStream.on('error', (error) => {
                  logger.logError(error, {
                    operation: 'extract-zip-entry',
                    fileName: entry.fileName
                  });
                  writeStream.destroy();
                  zipfile.readEntry();
                });

                readStream.pipe(writeStream);
              });
            }
          } catch (error) {
            logger.logError(error, {
              operation: 'process-zip-entry',
              fileName: entry.fileName
            });
            zipfile.readEntry();
          }
        });

        zipfile.on('end', () => {
          resolve({
            success: true,
            filesExtracted,
            totalBytes,
            extractedFiles
          });
        });

        zipfile.on('error', (error) => {
          reject(error);
        });
      });
    });
  }

  /**
   * Validate entry name for security
   * @private
   */
  _isValidEntryName(fileName) {
    // Reject entries with path traversal attempts
    if (fileName.includes('../') || fileName.includes('..\\')) {
      return false;
    }

    // Reject absolute paths
    if (path.isAbsolute(fileName)) {
      return false;
    }

    // Reject entries with null bytes
    if (fileName.includes('\0')) {
      return false;
    }

    // Reject entries with very long names
    if (fileName.length > 255) {
      return false;
    }

    return true;
  }

  /**
   * Get safe extraction path
   * @param {string} basePath - Base extraction path
   * @param {string} entryName - ZIP entry name
   * @returns {string} Safe extraction path
   */
  getSafeExtractionPath(basePath, entryName) {
    const normalizedBase = path.normalize(path.resolve(basePath));
    const normalizedEntry = path.normalize(entryName);
    const fullPath = path.join(normalizedBase, normalizedEntry);
    
    // Ensure the path is within the base directory
    if (!fullPath.startsWith(normalizedBase)) {
      throw new Error(`Path traversal attempt detected: ${entryName}`);
    }

    return fullPath;
  }
}

// Export singleton instance
export const zipExtractor = new ZipExtractor();