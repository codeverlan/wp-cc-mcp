#!/usr/bin/env node

import { ResearchManager } from './lib/research-manager.js';
import dotenv from 'dotenv';

dotenv.config();

async function testResearch() {
  const manager = new ResearchManager();
  
  console.log('Testing Natural Language Research in MCP\n');
  console.log('=' . repeat(50));
  
  // Test cases
  const testCases = [
    {
      name: 'Search Query',
      query: 'search for parenting SEO optimization strategies',
      expectedType: 'Search',
      expectedCategory: 'seo-ai-optimization'
    },
    {
      name: 'URL Analysis',
      query: 'analyze https://www.healthychildren.org/English/ages-stages/toddler/Pages/default.aspx',
      expectedType: 'URL Analysis',
      expectedCategory: 'behavioral-challenges'
    },
    {
      name: 'General Research',
      query: 'find information about sleep training methods',
      expectedType: 'Search',
      expectedCategory: 'sleep-issues'
    }
  ];
  
  for (const test of testCases) {
    console.log(`\nTest: ${test.name}`);
    console.log(`Query: "${test.query}"`);
    
    try {
      // Parse the query
      const parsed = manager.parseNaturalLanguageQuery(test.query);
      
      console.log('Results:');
      console.log(`  - Type detected: ${parsed.isSearch ? 'Search' : parsed.url ? 'URL Analysis' : 'Research'}`);
      console.log(`  - Category: ${parsed.subfolder}`);
      console.log(`  - Topic: ${parsed.topic}`);
      if (parsed.url) {
        console.log(`  - URL: ${parsed.url}`);
      }
      
      // Verify expectations
      const typeMatch = (parsed.isSearch && test.expectedType === 'Search') || 
                       (parsed.url && test.expectedType === 'URL Analysis');
      const categoryMatch = parsed.subfolder === test.expectedCategory;
      
      console.log(`  ✓ Type match: ${typeMatch ? '✅' : '❌'}`);
      console.log(`  ✓ Category match: ${categoryMatch ? '✅' : '❌'}`);
      
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '=' . repeat(50));
  console.log('Natural Language Research Testing Complete!');
  
  // Test actual API if key is available
  if (process.env.JINA_API_KEY) {
    console.log('\nTesting actual Jina API integration...');
    
    try {
      // Create a test project directory
      const fs = await import('fs-extra');
      const testProject = '/Users/tyler-lcsw/projects/wp-projects/test-mcp-research';
      await fs.ensureDir(testProject);
      
      // Test research
      const result = await manager.researchTopic('test-mcp-research', 'search for WordPress MCP tools');
      console.log('API Test Result:', result.content[0].text.split('\n')[0]);
      console.log('✅ Jina API integration working!');
      
      // Cleanup
      await fs.remove(testProject);
      
    } catch (error) {
      console.error('❌ API Test failed:', error.message);
    }
  } else {
    console.log('\nℹ️ Skipping API test (JINA_API_KEY not set)');
  }
}

testResearch().catch(console.error);