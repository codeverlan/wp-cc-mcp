import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import fs from 'fs-extra';
import { logger } from './logger.js';
import { createProgressResponse } from './mcp-response.js';

/**
 * Enhanced CSV Parser with streaming support
 */
export class CsvParser {
  constructor() {
    this.defaultOptions = {
      delimiter: ',',
      quote: '"',
      escape: '"',
      skip_empty_lines: true,
      trim: true,
      columns: true, // Use first row as column names
      cast: true,    // Auto-cast values
      cast_date: false, // Don't auto-cast dates
      skip_records_with_empty_values: false
    };
  }

  /**
   * Parse CSV file with streaming for large files
   * @param {string} filePath - Path to CSV file
   * @param {Object} options - Parsing options
   * @param {Function} onRow - Callback for each row (optional, for streaming)
   * @param {Function} onProgress - Progress callback (optional)
   * @returns {Promise<Object>} Parsing result
   */
  async parseFile(filePath, options = {}, onRow = null, onProgress = null) {
    const startTime = Date.now();
    const parseOptions = { ...this.defaultOptions, ...options };
    
    logger.info('Starting CSV parsing', { 
      filePath, 
      streaming: !!onRow,
      options: parseOptions 
    });

    try {
      // Check if file exists and get stats
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;
      
      if (fileSize === 0) {
        throw new Error('CSV file is empty');
      }

      let processedBytes = 0;
      let rowCount = 0;
      let errorCount = 0;
      const errors = [];
      const data = onRow ? null : []; // Only store data if not streaming
      
      return new Promise((resolve, reject) => {
        const parser = parse(parseOptions);
        const stream = createReadStream(filePath);

        // Track progress
        stream.on('data', (chunk) => {
          processedBytes += chunk.length;
          
          if (onProgress && fileSize > 0) {
            const progress = (processedBytes / fileSize) * 100;
            onProgress(progress, rowCount, processedBytes);
          }
        });

        // Handle parsed records
        parser.on('readable', function() {
          let record;
          while ((record = parser.read()) !== null) {
            rowCount++;
            
            try {
              if (onRow) {
                // Streaming mode - call callback for each row
                onRow(record, rowCount);
              } else {
                // Non-streaming mode - collect all data
                data.push(record);
              }
            } catch (error) {
              errorCount++;
              errors.push({
                row: rowCount,
                error: error.message,
                data: record
              });
              
              logger.warn('Error processing CSV row', {
                row: rowCount,
                error: error.message
              });
            }
          }
        });

        // Handle parser errors
        parser.on('error', (error) => {
          logger.logError(error, {
            operation: 'csv-parse',
            filePath,
            rowCount,
            processedBytes
          });
          reject(error);
        });

        // Handle completion
        parser.on('end', () => {
          const executionTime = Date.now() - startTime;
          
          logger.info('CSV parsing completed', {
            filePath,
            rowCount,
            errorCount,
            executionTime,
            fileSize: processedBytes
          });

          resolve({
            success: true,
            data: data,
            rowCount,
            errorCount,
            errors,
            executionTime,
            fileSize: processedBytes,
            streaming: !!onRow
          });
        });

        // Start parsing
        stream.pipe(parser);
      });

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.logError(error, {
        operation: 'csv-parse-setup',
        filePath,
        executionTime
      });

      throw error;
    }
  }

  /**
   * Parse CSV string data
   * @param {string} csvData - CSV data as string
   * @param {Object} options - Parsing options
   * @returns {Promise<Object>} Parsing result
   */
  async parseString(csvData, options = {}) {
    const startTime = Date.now();
    const parseOptions = { ...this.defaultOptions, ...options };
    
    logger.debug('Parsing CSV string', {
      dataLength: csvData.length,
      options: parseOptions
    });

    try {
      return new Promise((resolve, reject) => {
        const data = [];
        let rowCount = 0;
        let errorCount = 0;
        const errors = [];

        const parser = parse(parseOptions);

        parser.on('readable', function() {
          let record;
          while ((record = parser.read()) !== null) {
            rowCount++;
            
            try {
              data.push(record);
            } catch (error) {
              errorCount++;
              errors.push({
                row: rowCount,
                error: error.message,
                data: record
              });
            }
          }
        });

        parser.on('error', (error) => {
          logger.logError(error, {
            operation: 'csv-parse-string',
            dataLength: csvData.length
          });
          reject(error);
        });

        parser.on('end', () => {
          const executionTime = Date.now() - startTime;
          
          logger.debug('CSV string parsing completed', {
            rowCount,
            errorCount,
            executionTime
          });

          resolve({
            success: true,
            data,
            rowCount,
            errorCount,
            errors,
            executionTime
          });
        });

        parser.write(csvData);
        parser.end();
      });
    } catch (error) {
      logger.logError(error, {
        operation: 'csv-parse-string-setup',
        dataLength: csvData.length
      });
      throw error;
    }
  }

  /**
   * Validate CSV file structure
   * @param {string} filePath - Path to CSV file
   * @param {Object} schema - Expected schema
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} Validation result
   */
  async validateFile(filePath, schema = {}, options = {}) {
    const startTime = Date.now();
    
    logger.info('Starting CSV validation', { filePath, schema });

    try {
      // Parse first few rows to validate structure
      const parseOptions = {
        ...this.defaultOptions,
        ...options.parseOptions,
        to: options.sampleSize || 100 // Only read first 100 rows for validation
      };

      const result = await this.parseFile(filePath, parseOptions);
      const validationResults = {
        isValid: true,
        errors: [],
        warnings: [],
        rowCount: result.rowCount,
        sampleData: result.data.slice(0, 5), // First 5 rows as sample
        schema: {
          detected: {},
          expected: schema
        }
      };

      if (result.data.length === 0) {
        validationResults.isValid = false;
        validationResults.errors.push('CSV file contains no data rows');
        return validationResults;
      }

      // Detect actual schema from data
      const firstRow = result.data[0];
      const detectedColumns = Object.keys(firstRow);
      
      validationResults.schema.detected = {
        columns: detectedColumns,
        columnCount: detectedColumns.length,
        types: this._detectColumnTypes(result.data)
      };

      // Validate against expected schema if provided
      if (schema.requiredColumns) {
        const missingColumns = schema.requiredColumns.filter(
          col => !detectedColumns.includes(col)
        );
        
        if (missingColumns.length > 0) {
          validationResults.isValid = false;
          validationResults.errors.push(
            `Missing required columns: ${missingColumns.join(', ')}`
          );
        }
      }

      if (schema.columnCount) {
        if (detectedColumns.length !== schema.columnCount) {
          validationResults.warnings.push(
            `Expected ${schema.columnCount} columns, found ${detectedColumns.length}`
          );
        }
      }

      // Check for empty values in required columns
      if (schema.requiredColumns) {
        const emptyValueChecks = this._checkRequiredFields(
          result.data, 
          schema.requiredColumns
        );
        
        if (emptyValueChecks.length > 0) {
          validationResults.warnings.push(
            ...emptyValueChecks.map(check => 
              `Empty values in required column '${check.column}': ${check.count} rows`
            )
          );
        }
      }

      const executionTime = Date.now() - startTime;
      
      logger.info('CSV validation completed', {
        filePath,
        isValid: validationResults.isValid,
        errors: validationResults.errors.length,
        warnings: validationResults.warnings.length,
        executionTime
      });

      return {
        ...validationResults,
        executionTime
      };

    } catch (error) {
      logger.logError(error, {
        operation: 'csv-validation',
        filePath
      });
      throw error;
    }
  }

  /**
   * Convert CSV data to WordPress post format
   * @param {Array} csvData - Parsed CSV data
   * @param {Object} mapping - Column to WordPress field mapping
   * @returns {Array} Array of WordPress post objects
   */
  convertToWordPressFormat(csvData, mapping = {}) {
    const defaultMapping = {
      title: ['title', 'post_title', 'article_title', 'Article Title'],
      content: ['content', 'post_content', 'body', 'description'],
      excerpt: ['excerpt', 'post_excerpt', 'summary'],
      status: ['status', 'post_status'],
      category: ['category', 'categories', 'Category'],
      tags: ['tags', 'post_tags', 'keywords'],
      meta: {
        target_keyword: ['target_keyword', 'Target Keyword', 'keyword'],
        primary_keyword: ['primary_keyword', 'Primary Keyword'],
        search_volume: ['search_volume', 'Search Volume'],
        competition: ['competition', 'Competition']
      }
    };

    const finalMapping = { ...defaultMapping, ...mapping };

    return csvData.map((row, index) => {
      const post = {
        title: this._findFieldValue(row, finalMapping.title) || `Post ${index + 1}`,
        content: this._findFieldValue(row, finalMapping.content) || '',
        excerpt: this._findFieldValue(row, finalMapping.excerpt) || '',
        status: this._findFieldValue(row, finalMapping.status) || 'draft',
        category: this._findFieldValue(row, finalMapping.category) || null,
        tags: this._findFieldValue(row, finalMapping.tags) || null,
        meta: {}
      };

      // Handle meta fields
      if (finalMapping.meta) {
        for (const [metaKey, possibleFields] of Object.entries(finalMapping.meta)) {
          const value = this._findFieldValue(row, possibleFields);
          if (value !== null && value !== undefined && value !== '') {
            post.meta[metaKey] = value;
          }
        }
      }

      // Add any unmapped fields as meta
      const mappedFields = this._getAllMappedFields(finalMapping);
      for (const [key, value] of Object.entries(row)) {
        if (!mappedFields.includes(key) && value !== null && value !== '') {
          post.meta[key] = value;
        }
      }

      return post;
    });
  }

  /**
   * Create progress tracker for CSV operations
   * @param {string} operation - Operation name
   * @param {number} totalRows - Total number of rows (if known)
   * @returns {Function} Progress reporter function
   */
  createProgressTracker(operation, totalRows = null) {
    let lastReportedProgress = 0;
    const startTime = Date.now();

    return (currentRow, processedBytes = null, totalBytes = null) => {
      const progress = totalRows 
        ? (currentRow / totalRows) * 100
        : totalBytes 
          ? (processedBytes / totalBytes) * 100
          : 0;

      // Only report progress every 5% or every 1000 rows
      if (progress - lastReportedProgress >= 5 || currentRow % 1000 === 0) {
        const elapsed = Date.now() - startTime;
        const rate = currentRow / (elapsed / 1000); // rows per second
        
        logger.info(`CSV ${operation} progress`, {
          progress: progress.toFixed(1) + '%',
          currentRow,
          totalRows,
          rate: rate.toFixed(1) + ' rows/sec',
          elapsed: elapsed + 'ms'
        });

        lastReportedProgress = progress;
        
        return createProgressResponse(
          `${operation}: ${currentRow} rows processed`, 
          progress,
          {
            currentRow,
            totalRows,
            rate,
            elapsed
          }
        );
      }

      return null;
    };
  }

  // Private helper methods

  /**
   * Find field value from row data using multiple possible field names
   * @private
   */
  _findFieldValue(row, possibleFields) {
    if (!Array.isArray(possibleFields)) {
      possibleFields = [possibleFields];
    }

    for (const field of possibleFields) {
      if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
        return row[field];
      }
    }

    return null;
  }

  /**
   * Get all mapped field names
   * @private
   */
  _getAllMappedFields(mapping) {
    const fields = [];
    
    for (const value of Object.values(mapping)) {
      if (Array.isArray(value)) {
        fields.push(...value);
      } else if (typeof value === 'object') {
        for (const subValue of Object.values(value)) {
          if (Array.isArray(subValue)) {
            fields.push(...subValue);
          } else {
            fields.push(subValue);
          }
        }
      } else {
        fields.push(value);
      }
    }

    return fields;
  }

  /**
   * Detect column data types
   * @private
   */
  _detectColumnTypes(data) {
    if (data.length === 0) return {};

    const types = {};
    const columns = Object.keys(data[0]);
    const sampleSize = Math.min(data.length, 100);

    for (const column of columns) {
      const samples = data.slice(0, sampleSize)
        .map(row => row[column])
        .filter(val => val !== null && val !== undefined && val !== '');

      if (samples.length === 0) {
        types[column] = 'empty';
        continue;
      }

      const numericCount = samples.filter(val => !isNaN(val) && !isNaN(parseFloat(val))).length;
      const booleanCount = samples.filter(val => 
        ['true', 'false', '1', '0', 'yes', 'no'].includes(String(val).toLowerCase())
      ).length;

      if (numericCount / samples.length > 0.8) {
        types[column] = 'number';
      } else if (booleanCount / samples.length > 0.8) {
        types[column] = 'boolean';
      } else {
        types[column] = 'string';
      }
    }

    return types;
  }

  /**
   * Check for empty values in required columns
   * @private
   */
  _checkRequiredFields(data, requiredColumns) {
    const checks = [];

    for (const column of requiredColumns) {
      const emptyCount = data.filter(row => {
        const value = row[column];
        return value === null || value === undefined || String(value).trim() === '';
      }).length;

      if (emptyCount > 0) {
        checks.push({
          column,
          count: emptyCount,
          percentage: (emptyCount / data.length) * 100
        });
      }
    }

    return checks;
  }
}

// Export singleton instance
export const csvParser = new CsvParser();