/**
 * Testing Manager - Handles WordPress site testing and validation
 * Refactored to use new utilities for improved reliability and logging
 * @version 2.0.0
 */

import path from 'path';
import fs from 'fs-extra';
import { logger } from './logger.js';
import { config } from './config-manager.js';
import { commandExecutor } from './command-executor.js';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createJsonResponse 
} from './mcp-response.js';

export class TestingManager {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    logger.debug('TestingManager initialized');
  }

  async getProjectPath(projectName) {
    return config.getProjectPath(projectName);
  }

  /**
   * Test all links on the WordPress site for 404 errors
   */
  async testAllLinks(project) {
    const projectPath = path.join(this.projectsDir, project);
    const testResultsPath = path.join(projectPath, 'test-results');
    
    try {
      // Ensure test results directory exists
      await fs.mkdir(testResultsPath, { recursive: true });
      
      // Get the port for this project
      const envPath = path.join(projectPath, '.env');
      const envContent = await fs.readFile(envPath, 'utf-8');
      const portMatch = envContent.match(/WORDPRESS_PORT=(\d+)/);
      const port = portMatch ? portMatch[1] : '8080';
      
      const siteUrl = `http://localhost:${port}`;
      
      // Create a test script for link validation
      const testScript = `
import { chromium } from 'playwright';

async function testLinks() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const results = {
    tested: [],
    errors: [],
    warnings: []
  };
  
  // Visit homepage
  await page.goto('${siteUrl}');
  
  // Extract all links
  const links = await page.evaluate(() => {
    const anchors = document.querySelectorAll('a[href]');
    return Array.from(anchors).map(a => ({
      href: a.href,
      text: a.textContent.trim(),
      location: a.closest('[class], [id]')?.className || a.closest('[class], [id]')?.id || 'unknown'
    }));
  });
  
  // Test each unique link
  const uniqueLinks = [...new Set(links.map(l => l.href))];
  
  for (const link of uniqueLinks) {
    try {
      const response = await page.goto(link, { waitUntil: 'networkidle' });
      const status = response.status();
      
      results.tested.push({
        url: link,
        status: status,
        success: status >= 200 && status < 400
      });
      
      if (status === 404) {
        results.errors.push({
          url: link,
          error: '404 Not Found',
          foundIn: links.filter(l => l.href === link).map(l => l.location)
        });
      } else if (status >= 400) {
        results.warnings.push({
          url: link,
          status: status,
          foundIn: links.filter(l => l.href === link).map(l => l.location)
        });
      }
    } catch (error) {
      results.errors.push({
        url: link,
        error: error.message
      });
    }
  }
  
  await browser.close();
  return results;
}

testLinks().then(results => {
  console.log(JSON.stringify(results, null, 2));
}).catch(console.error);
`;

      // Write test script
      const testScriptPath = path.join(testResultsPath, 'test-links.mjs');
      await fs.writeFile(testScriptPath, testScript);
      
      // Run the test using npx playwright
      const { stdout, stderr } = await execAsync(
        `cd ${testResultsPath} && npx playwright test-links.mjs`,
        { maxBuffer: 10 * 1024 * 1024 }
      );
      
      const results = JSON.parse(stdout);
      
      // Save results
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const resultsFile = path.join(testResultsPath, `link-test-${timestamp}.json`);
      await fs.writeFile(resultsFile, JSON.stringify(results, null, 2));
      
      return {
        success: results.errors.length === 0,
        summary: {
          total_tested: results.tested.length,
          successful: results.tested.filter(t => t.success).length,
          errors: results.errors.length,
          warnings: results.warnings.length
        },
        errors: results.errors,
        warnings: results.warnings,
        results_file: resultsFile
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        note: 'Ensure Playwright is installed and Docker containers are running'
      };
    }
  }

  /**
   * Validate SEO implementation
   */
  async validateSEO(project) {
    const projectPath = path.join(this.projectsDir, project);
    const testResultsPath = path.join(projectPath, 'test-results');
    
    try {
      await fs.mkdir(testResultsPath, { recursive: true });
      
      // Get the port for this project
      const envPath = path.join(projectPath, '.env');
      const envContent = await fs.readFile(envPath, 'utf-8');
      const portMatch = envContent.match(/WORDPRESS_PORT=(\d+)/);
      const port = portMatch ? portMatch[1] : '8080';
      
      const siteUrl = `http://localhost:${port}`;
      
      // Create SEO validation script
      const seoScript = `
import { chromium } from 'playwright';

async function validateSEO() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const seoChecks = {
    pages: [],
    issues: [],
    warnings: []
  };
  
  // Pages to check
  const pagesToCheck = [
    '/',
    '/sample-page/',
    '/wp-admin/'
  ];
  
  for (const pagePath of pagesToCheck) {
    await page.goto('${siteUrl}' + pagePath);
    
    const pageChecks = await page.evaluate(() => {
      const checks = {
        url: window.location.href,
        title: document.title,
        meta_description: document.querySelector('meta[name="description"]')?.content,
        meta_keywords: document.querySelector('meta[name="keywords"]')?.content,
        og_title: document.querySelector('meta[property="og:title"]')?.content,
        og_description: document.querySelector('meta[property="og:description"]')?.content,
        og_image: document.querySelector('meta[property="og:image"]')?.content,
        canonical: document.querySelector('link[rel="canonical"]')?.href,
        h1_count: document.querySelectorAll('h1').length,
        h1_text: Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim()),
        img_without_alt: Array.from(document.querySelectorAll('img:not([alt])')).length,
        schema_markup: document.querySelectorAll('script[type="application/ld+json"]').length > 0
      };
      
      return checks;
    });
    
    // Validate SEO requirements
    const issues = [];
    const warnings = [];
    
    if (!pageChecks.title || pageChecks.title.length < 30) {
      issues.push('Title tag is missing or too short (should be 30-60 characters)');
    }
    if (!pageChecks.meta_description) {
      issues.push('Meta description is missing');
    }
    if (pageChecks.h1_count === 0) {
      issues.push('No H1 tag found');
    }
    if (pageChecks.h1_count > 1) {
      warnings.push('Multiple H1 tags found (should have only one)');
    }
    if (pageChecks.img_without_alt > 0) {
      warnings.push(\`\${pageChecks.img_without_alt} images without alt text\`);
    }
    if (!pageChecks.og_title) {
      warnings.push('Open Graph title is missing');
    }
    if (!pageChecks.schema_markup) {
      warnings.push('No schema.org markup found');
    }
    
    pageChecks.issues = issues;
    pageChecks.warnings = warnings;
    seoChecks.pages.push(pageChecks);
    
    seoChecks.issues.push(...issues.map(i => ({ page: pagePath, issue: i })));
    seoChecks.warnings.push(...warnings.map(w => ({ page: pagePath, warning: w })));
  }
  
  await browser.close();
  return seoChecks;
}

validateSEO().then(results => {
  console.log(JSON.stringify(results, null, 2));
}).catch(console.error);
`;

      // Write SEO script
      const seoScriptPath = path.join(testResultsPath, 'validate-seo.mjs');
      await fs.writeFile(seoScriptPath, seoScript);
      
      // Run the SEO validation
      const { stdout } = await execAsync(
        `cd ${testResultsPath} && npx playwright validate-seo.mjs`,
        { maxBuffer: 10 * 1024 * 1024 }
      );
      
      const results = JSON.parse(stdout);
      
      // Save results
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const resultsFile = path.join(testResultsPath, `seo-validation-${timestamp}.json`);
      await fs.writeFile(resultsFile, JSON.stringify(results, null, 2));
      
      return {
        success: results.issues.length === 0,
        summary: {
          pages_checked: results.pages.length,
          total_issues: results.issues.length,
          total_warnings: results.warnings.length
        },
        issues: results.issues,
        warnings: results.warnings,
        results_file: resultsFile
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        note: 'Ensure Playwright is installed and the site is running'
      };
    }
  }

  /**
   * Run comprehensive test suite
   */
  async runComprehensiveTests(project) {
    try {
      await this.initialize();
      
      logger.info('Starting comprehensive test suite', { project });
      
      const results = {
        project: project,
        timestamp: new Date().toISOString(),
        tests: {}
      };
      
      // Run link tests
      logger.debug('Running link validation', { project });
      results.tests.links = await this.testAllLinks(project);
      
      // Run SEO validation
      logger.debug('Running SEO validation', { project });
      results.tests.seo = await this.validateSEO(project);
      
      // Overall success
      results.success = results.tests.links.success && results.tests.seo.success;
      
      // Save comprehensive results
      const projectPath = await this.getProjectPath(project);
      const testResultsPath = path.join(projectPath, 'test-results');
      await fs.ensureDir(testResultsPath);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const resultsFile = path.join(testResultsPath, `comprehensive-test-${timestamp}.json`);
      
      await fs.writeJSON(resultsFile, results, { spaces: 2 });
      
      const recommendation = results.success 
        ? 'All tests passed. Site is ready for deployment.'
        : 'Issues found. Please fix errors before deployment.';
      
      logger.info('Comprehensive test suite completed', {
        project,
        success: results.success,
        linksSuccess: results.tests.links.success,
        seoSuccess: results.tests.seo.success
      });
      
      return createJsonResponse(results, {
        project,
        success: results.success,
        recommendation,
        resultsFile: path.basename(resultsFile)
      });
      
    } catch (error) {
      logger.logError(error, {
        operation: 'run-comprehensive-tests',
        project
      });
      return createErrorResponse(
        `Comprehensive testing failed: ${error.message}`,
        { project }
      );
    }
  }

  /**
   * Generate test report
   */
  async generateTestReport(project) {
    const projectPath = path.join(this.projectsDir, project);
    const testResultsPath = path.join(projectPath, 'test-results');
    
    try {
      // Find all test result files
      const files = await fs.readdir(testResultsPath);
      const testFiles = files.filter(f => f.endsWith('.json'));
      
      if (testFiles.length === 0) {
        return {
          success: false,
          message: 'No test results found. Run tests first.'
        };
      }
      
      // Get the most recent comprehensive test
      const comprehensiveTests = testFiles.filter(f => f.startsWith('comprehensive-test-'));
      comprehensiveTests.sort().reverse();
      
      if (comprehensiveTests.length > 0) {
        const latestTest = comprehensiveTests[0];
        const testData = JSON.parse(
          await fs.readFile(path.join(testResultsPath, latestTest), 'utf-8')
        );
        
        // Generate markdown report
        let report = `# WordPress Testing Report\n\n`;
        report += `**Project:** ${project}\n`;
        report += `**Date:** ${testData.timestamp}\n`;
        report += `**Overall Status:** ${testData.success ? '✅ PASSED' : '❌ FAILED'}\n\n`;
        
        report += `## Link Validation\n`;
        report += `- Total Links Tested: ${testData.tests.links.summary.total_tested}\n`;
        report += `- Successful: ${testData.tests.links.summary.successful}\n`;
        report += `- Errors: ${testData.tests.links.summary.errors}\n`;
        report += `- Warnings: ${testData.tests.links.summary.warnings}\n\n`;
        
        if (testData.tests.links.errors.length > 0) {
          report += `### Link Errors\n`;
          testData.tests.links.errors.forEach(error => {
            report += `- **${error.url}**: ${error.error}\n`;
          });
          report += `\n`;
        }
        
        report += `## SEO Validation\n`;
        report += `- Pages Checked: ${testData.tests.seo.summary.pages_checked}\n`;
        report += `- Issues: ${testData.tests.seo.summary.total_issues}\n`;
        report += `- Warnings: ${testData.tests.seo.summary.total_warnings}\n\n`;
        
        if (testData.tests.seo.issues.length > 0) {
          report += `### SEO Issues\n`;
          testData.tests.seo.issues.forEach(issue => {
            report += `- **${issue.page}**: ${issue.issue}\n`;
          });
          report += `\n`;
        }
        
        report += `## Recommendation\n`;
        report += testData.recommendation + '\n';
        
        // Save report
        const reportFile = path.join(testResultsPath, `test-report-${testData.timestamp.replace(/[:.]/g, '-')}.md`);
        await fs.writeFile(reportFile, report);
        
        return {
          success: true,
          report: report,
          report_file: reportFile,
          test_status: testData.success
        };
      }
      
      return {
        success: false,
        message: 'No comprehensive test results found. Run comprehensive tests first.'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}