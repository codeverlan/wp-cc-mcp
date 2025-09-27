import {
  createTextResponse,
  createJsonResponse,
  createErrorResponse,
  createSuccessResponse,
  createProgressResponse,
  createListResponse,
  createTableResponse,
  createCommandResponse,
  wrapResponse,
  validateMcpResponse
} from './mcp-response.js';

describe('MCP Response Utilities', () => {
  describe('createTextResponse', () => {
    it('should create a valid text response', () => {
      const response = createTextResponse('Hello, world!');
      
      expect(response).toEqual({
        content: [
          {
            type: 'text',
            text: 'Hello, world!'
          }
        ]
      });
    });

    it('should include metadata when provided', () => {
      const response = createTextResponse('Test', { extra: 'data' });
      
      expect(response).toEqual({
        content: [
          {
            type: 'text',
            text: 'Test'
          }
        ],
        extra: 'data'
      });
    });
  });

  describe('createJsonResponse', () => {
    it('should create a JSON response with data', () => {
      const data = { key: 'value', number: 42 };
      const response = createJsonResponse(data);
      
      expect(response.content).toHaveLength(1);
      expect(response.content[0]).toEqual({
        type: 'json',
        json: data
      });
    });

    it('should include summary text when provided', () => {
      const data = { test: true };
      const response = createJsonResponse(data, 'Test data summary');
      
      expect(response.content).toHaveLength(2);
      expect(response.content[0]).toEqual({
        type: 'text',
        text: 'Test data summary'
      });
      expect(response.content[1]).toEqual({
        type: 'json',
        json: data
      });
    });
  });

  describe('createErrorResponse', () => {
    it('should create an error response from string', () => {
      const response = createErrorResponse('Something went wrong');
      
      expect(response.content[0]).toEqual({
        type: 'text',
        text: 'Error: Something went wrong'
      });
      expect(response.isError).toBe(true);
      expect(response.errorDetails.error).toBe('Something went wrong');
    });

    it('should create an error response from Error object', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      
      const response = createErrorResponse(error);
      
      expect(response.content[0].text).toBe('Error: Test error');
      expect(response.errorDetails.error).toBe('Test error');
      expect(response.errorDetails.stack).toBe('Error stack trace');
    });

    it('should include context when provided', () => {
      const response = createErrorResponse('Error message', { context: 'test' });
      
      expect(response.errorDetails.context).toBe('test');
    });
  });

  describe('createSuccessResponse', () => {
    it('should create a success response with message only', () => {
      const response = createSuccessResponse('Operation completed');
      
      expect(response.content).toHaveLength(1);
      expect(response.content[0]).toEqual({
        type: 'text',
        text: 'Operation completed'
      });
      expect(response.success).toBe(true);
    });

    it('should include data when provided', () => {
      const data = { result: 'success' };
      const response = createSuccessResponse('Done', data);
      
      expect(response.content).toHaveLength(2);
      expect(response.content[1]).toEqual({
        type: 'json',
        json: data
      });
    });
  });

  describe('createProgressResponse', () => {
    it('should create a progress response', () => {
      const response = createProgressResponse('Processing...', 45.5);
      
      expect(response.content[0].text).toBe('[45.5%] Processing...');
      expect(response.progress).toEqual({
        percentage: 45.5,
        message: 'Processing...'
      });
    });

    it('should include progress data when provided', () => {
      const progressData = { currentItem: 5, totalItems: 10 };
      const response = createProgressResponse('Working', 50, progressData);
      
      expect(response.progress.data).toEqual(progressData);
    });
  });

  describe('createListResponse', () => {
    it('should create a list response with items', () => {
      const items = ['item1', 'item2', 'item3'];
      const response = createListResponse(items);
      
      expect(response.content).toHaveLength(2);
      expect(response.content[0].text).toContain('1. item1');
      expect(response.content[0].text).toContain('2. item2');
      expect(response.content[0].text).toContain('3. item3');
      expect(response.content[1].json).toEqual({
        items,
        count: 3
      });
    });

    it('should handle empty list', () => {
      const response = createListResponse([]);
      
      expect(response.content[0].text).toBe('No items found.');
      expect(response.content[1].json.count).toBe(0);
    });

    it('should use formatter when provided', () => {
      const items = [{ name: 'test1' }, { name: 'test2' }];
      const formatter = (item) => `• ${item.name}`;
      const response = createListResponse(items, 'Test Items', formatter);
      
      expect(response.content[0].text).toContain('Test Items:');
      expect(response.content[0].text).toContain('• test1');
      expect(response.content[0].text).toContain('• test2');
    });
  });

  describe('createTableResponse', () => {
    it('should create a table response', () => {
      const data = [
        { name: 'John', age: 30, city: 'New York' },
        { name: 'Jane', age: 25, city: 'Los Angeles' }
      ];
      const columns = [
        { key: 'name', header: 'Name' },
        { key: 'age', header: 'Age' },
        { key: 'city', header: 'City' }
      ];
      
      const response = createTableResponse(data, columns);
      
      expect(response.content).toHaveLength(2);
      expect(response.content[0].text).toContain('Name | Age | City');
      expect(response.content[0].text).toContain('John | 30  | New York');
      expect(response.content[1].json).toEqual({
        data,
        columns,
        rowCount: 2
      });
    });

    it('should handle empty data', () => {
      const response = createTableResponse([], []);
      
      expect(response.content[0].text).toBe('No data available.');
    });
  });

  describe('createCommandResponse', () => {
    it('should create a successful command response', () => {
      const result = {
        exitCode: 0,
        stdout: 'Command output',
        stderr: ''
      };
      
      const response = createCommandResponse('test command', result, 1500);
      
      expect(response.content[0].text).toContain('Command: test command');
      expect(response.content[0].text).toContain('Status: SUCCESS');
      expect(response.content[0].text).toContain('(1500ms)');
      expect(response.content[0].text).toContain('Output:\nCommand output');
      expect(response.command.success).toBe(true);
    });

    it('should create a failed command response', () => {
      const result = {
        exitCode: 1,
        stdout: '',
        stderr: 'Error occurred'
      };
      
      const response = createCommandResponse('failing command', result);
      
      expect(response.content[0].text).toContain('Status: FAILED');
      expect(response.content[0].text).toContain('Error Output:\nError occurred');
      expect(response.command.success).toBe(false);
    });
  });

  describe('wrapResponse', () => {
    it('should return already formatted MCP response as-is', () => {
      const mcpResponse = {
        content: [{ type: 'text', text: 'Already formatted' }]
      };
      
      const wrapped = wrapResponse(mcpResponse);
      expect(wrapped).toBe(mcpResponse);
    });

    it('should wrap string as text response', () => {
      const wrapped = wrapResponse('Simple string');
      
      expect(wrapped.content[0]).toEqual({
        type: 'text',
        text: 'Simple string'
      });
    });

    it('should wrap object with message property', () => {
      const wrapped = wrapResponse({ message: 'Object message', other: 'data' });
      
      expect(wrapped.content[0].text).toBe('Object message');
    });

    it('should wrap plain object as JSON response', () => {
      const obj = { key: 'value' };
      const wrapped = wrapResponse(obj);
      
      expect(wrapped.content[0]).toEqual({
        type: 'json',
        json: obj
      });
    });

    it('should handle null/undefined values', () => {
      const wrappedNull = wrapResponse(null);
      expect(wrappedNull.content[0].text).toBe('null');
      
      const wrappedUndefined = wrapResponse(undefined);
      expect(wrappedUndefined.content[0].text).toBe('undefined');
    });
  });

  describe('validateMcpResponse', () => {
    it('should validate correct MCP response', () => {
      const validResponse = {
        content: [
          { type: 'text', text: 'Valid response' },
          { type: 'json', json: { data: 'value' } }
        ]
      };
      
      const validation = validateMcpResponse(validResponse);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing content property', () => {
      const invalidResponse = { success: true };
      
      const validation = validateMcpResponse(invalidResponse);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Response must have a content property');
    });

    it('should detect non-array content', () => {
      const invalidResponse = { content: 'not an array' };
      
      const validation = validateMcpResponse(invalidResponse);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Response content must be an array');
    });

    it('should detect missing type in content items', () => {
      const invalidResponse = {
        content: [{ text: 'Missing type' }]
      };
      
      const validation = validateMcpResponse(invalidResponse);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Content item 0 must have a type property');
    });

    it('should detect invalid content type', () => {
      const invalidResponse = {
        content: [{ type: 'invalid', text: 'Bad type' }]
      };
      
      const validation = validateMcpResponse(invalidResponse);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Content item 0 has invalid type: invalid');
    });

    it('should detect missing text property for text type', () => {
      const invalidResponse = {
        content: [{ type: 'text' }]
      };
      
      const validation = validateMcpResponse(invalidResponse);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Content item 0 of type \'text\' must have a string text property');
    });

    it('should detect missing json property for json type', () => {
      const invalidResponse = {
        content: [{ type: 'json' }]
      };
      
      const validation = validateMcpResponse(invalidResponse);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Content item 0 of type \'json\' must have a json property');
    });

    it('should handle non-object input', () => {
      const validation = validateMcpResponse('not an object');
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Response must be an object');
    });
  });
});