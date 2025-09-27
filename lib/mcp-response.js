/**
 * MCP Response Utilities
 * Standardizes all MCP tool responses according to the protocol
 */

/**
 * Create a text response
 * @param {string} text - The text content
 * @param {Object} meta - Optional metadata
 * @returns {Object} MCP-formatted response
 */
export function createTextResponse(text, meta = {}) {
  return {
    content: [
      {
        type: 'text',
        text: text
      }
    ],
    ...meta
  };
}

/**
 * Create a JSON response
 * @param {Object} data - The JSON data
 * @param {string} summary - Optional text summary
 * @param {Object} meta - Optional metadata
 * @returns {Object} MCP-formatted response
 */
export function createJsonResponse(data, summary = null, meta = {}) {
  const content = [];
  
  if (summary) {
    content.push({
      type: 'text',
      text: summary
    });
  }
  
  content.push({
    type: 'json',
    json: data
  });

  return {
    content,
    ...meta
  };
}

/**
 * Create an error response
 * @param {string|Error} error - Error message or Error object
 * @param {Object} context - Additional context
 * @returns {Object} MCP-formatted error response
 */
export function createErrorResponse(error, context = {}) {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorData = {
    error: errorMessage,
    ...context
  };

  if (error instanceof Error && error.stack) {
    errorData.stack = error.stack;
  }

  return {
    content: [
      {
        type: 'text',
        text: `Error: ${errorMessage}`
      }
    ],
    isError: true,
    errorDetails: errorData
  };
}

/**
 * Create a success response with data
 * @param {string} message - Success message
 * @param {Object} data - Optional data payload
 * @returns {Object} MCP-formatted response
 */
export function createSuccessResponse(message, data = null) {
  const response = {
    content: [
      {
        type: 'text',
        text: message
      }
    ],
    success: true
  };

  if (data) {
    response.content.push({
      type: 'json',
      json: data
    });
  }

  return response;
}

/**
 * Create a progress response (for streaming operations)
 * @param {string} message - Progress message
 * @param {number} progress - Progress percentage (0-100)
 * @param {Object} data - Optional progress data
 * @returns {Object} MCP-formatted progress response
 */
export function createProgressResponse(message, progress, data = null) {
  const response = {
    content: [
      {
        type: 'text',
        text: `[${progress.toFixed(1)}%] ${message}`
      }
    ],
    progress: {
      percentage: progress,
      message
    }
  };

  if (data) {
    response.progress.data = data;
  }

  return response;
}

/**
 * Create a list response
 * @param {Array} items - Array of items
 * @param {string} title - Optional title for the list
 * @param {Function} formatter - Optional formatter function for items
 * @returns {Object} MCP-formatted response
 */
export function createListResponse(items, title = null, formatter = null) {
  let text = title ? `${title}:\n` : '';
  
  if (items.length === 0) {
    text += 'No items found.';
  } else {
    if (formatter && typeof formatter === 'function') {
      text += items.map(formatter).join('\n');
    } else {
      text += items.map((item, index) => `${index + 1}. ${item}`).join('\n');
    }
  }

  return {
    content: [
      {
        type: 'text',
        text
      },
      {
        type: 'json',
        json: {
          items,
          count: items.length
        }
      }
    ]
  };
}

/**
 * Create a table response
 * @param {Array} data - Array of objects for table rows
 * @param {Array} columns - Column definitions
 * @param {string} title - Optional table title
 * @returns {Object} MCP-formatted response
 */
export function createTableResponse(data, columns, title = null) {
  let text = title ? `${title}:\n\n` : '';
  
  if (data.length === 0) {
    text += 'No data available.';
  } else {
    // Create header
    const headers = columns.map(col => col.header || col.key);
    const widths = headers.map((header, i) => Math.max(
      header.length,
      Math.max(...data.map(row => String(row[columns[i].key] || '').length))
    ));

    // Header row
    text += headers.map((header, i) => header.padEnd(widths[i])).join(' | ') + '\n';
    text += widths.map(width => '-'.repeat(width)).join('-|-') + '\n';

    // Data rows
    data.forEach(row => {
      const cells = columns.map((col, i) => {
        const value = row[col.key] || '';
        const formatted = col.formatter ? col.formatter(value, row) : String(value);
        return formatted.padEnd(widths[i]);
      });
      text += cells.join(' | ') + '\n';
    });
  }

  return {
    content: [
      {
        type: 'text',
        text: text.trim()
      },
      {
        type: 'json',
        json: {
          data,
          columns,
          rowCount: data.length
        }
      }
    ]
  };
}

/**
 * Create a command result response
 * @param {string} command - The command that was executed
 * @param {Object} result - Command execution result
 * @param {number} executionTime - Execution time in milliseconds
 * @returns {Object} MCP-formatted response
 */
export function createCommandResponse(command, result, executionTime = null) {
  const success = result.exitCode === 0;
  const statusText = success ? 'SUCCESS' : 'FAILED';
  
  let text = `Command: ${command}\n`;
  text += `Status: ${statusText}`;
  
  if (executionTime !== null) {
    text += ` (${executionTime}ms)`;
  }
  
  if (result.exitCode !== undefined) {
    text += `\nExit Code: ${result.exitCode}`;
  }

  if (result.stdout) {
    text += `\n\nOutput:\n${result.stdout}`;
  }

  if (result.stderr) {
    text += `\n\nError Output:\n${result.stderr}`;
  }

  return {
    content: [
      {
        type: 'text',
        text
      }
    ],
    command: {
      command,
      success,
      exitCode: result.exitCode,
      executionTime
    }
  };
}

/**
 * Wrap any response to ensure it follows MCP protocol
 * @param {*} response - The response to wrap
 * @returns {Object} MCP-formatted response
 */
export function wrapResponse(response) {
  // If already properly formatted, return as-is
  if (response && response.content && Array.isArray(response.content)) {
    return response;
  }

  // If it's a simple string, convert to text response
  if (typeof response === 'string') {
    return createTextResponse(response);
  }

  // If it's an object with a message property, use that
  if (response && typeof response === 'object' && response.message) {
    return createTextResponse(response.message);
  }

  // If it's any other object, convert to JSON response
  if (response && typeof response === 'object') {
    return createJsonResponse(response);
  }

  // Fallback to string representation
  return createTextResponse(String(response));
}

/**
 * Validation function to ensure response follows MCP protocol
 * @param {Object} response - Response to validate
 * @returns {Object} Validation result
 */
export function validateMcpResponse(response) {
  const errors = [];

  if (!response || typeof response !== 'object') {
    errors.push('Response must be an object');
    return { isValid: false, errors };
  }

  if (!response.content) {
    errors.push('Response must have a content property');
  } else if (!Array.isArray(response.content)) {
    errors.push('Response content must be an array');
  } else {
    response.content.forEach((item, index) => {
      if (!item.type) {
        errors.push(`Content item ${index} must have a type property`);
      } else if (!['text', 'json', 'image', 'resource'].includes(item.type)) {
        errors.push(`Content item ${index} has invalid type: ${item.type}`);
      }

      if (item.type === 'text' && typeof item.text !== 'string') {
        errors.push(`Content item ${index} of type 'text' must have a string text property`);
      }

      if (item.type === 'json' && item.json === undefined) {
        errors.push(`Content item ${index} of type 'json' must have a json property`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}