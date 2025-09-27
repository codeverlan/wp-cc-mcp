import { commandExecutor } from './command-executor.js';
import { config } from './config-manager.js';
import { logger } from './logger.js';
import { 
  createTextResponse, 
  createJsonResponse, 
  createErrorResponse,
  createSuccessResponse,
  createListResponse,
  createTableResponse
} from './mcp-response.js';

/**
 * GitHub CLI Integration Manager
 * Provides comprehensive GitHub operations using the GitHub CLI
 */
export class GitHubManager {
  constructor() {
    this.ghBin = config.get('githubCliBin');
  }

  /**
   * Check GitHub CLI authentication status
   * @returns {Promise<Object>} Authentication status
   */
  async checkAuth() {
    try {
      const result = await commandExecutor.executeGitHub(['auth', 'status'], {
        timeout: 10000
      });

      if (result.success) {
        // Parse auth status output
        const lines = result.stdout.split('\n');
        const authInfo = {
          authenticated: true,
          user: null,
          scopes: []
        };

        lines.forEach(line => {
          if (line.includes('Logged in to github.com as')) {
            authInfo.user = line.split('as ')[1]?.split(' ')[0];
          }
          if (line.includes('Token:') && line.includes('scopes:')) {
            const scopesMatch = line.match(/scopes: (.+)/);
            if (scopesMatch) {
              authInfo.scopes = scopesMatch[1].split(', ');
            }
          }
        });

        return createSuccessResponse(
          `GitHub CLI authenticated as ${authInfo.user || 'unknown user'}`,
          authInfo
        );
      } else {
        return createErrorResponse(
          'GitHub CLI not authenticated',
          { output: result.stderr }
        );
      }
    } catch (error) {
      logger.logError(error, { operation: 'gh-auth-status' });
      return createErrorResponse(
        `Failed to check GitHub authentication: ${error.message}`
      );
    }
  }

  /**
   * Create a new GitHub repository
   * @param {string} name - Repository name
   * @param {Object} options - Repository options
   * @returns {Promise<Object>} Creation result
   */
  async createRepository(name, options = {}) {
    const {
      description = '',
      visibility = 'public', // 'public', 'private', 'internal'
      gitignoreTemplate = null,
      license = null,
      clone = true,
      directory = null
    } = options;

    try {
      logger.info('Creating GitHub repository', { name, visibility });

      const args = ['repo', 'create', name];
      
      if (description) args.push('--description', description);
      if (visibility === 'private') args.push('--private');
      if (visibility === 'internal') args.push('--internal');
      if (gitignoreTemplate) args.push('--gitignore', gitignoreTemplate);
      if (license) args.push('--license', license);
      if (clone) args.push('--clone');

      const result = await commandExecutor.executeGitHub(args, {
        cwd: directory || process.cwd(),
        timeout: 30000
      });

      if (result.success) {
        return createSuccessResponse(
          `Repository ${name} created successfully`,
          {
            name,
            visibility,
            cloned: clone,
            url: `https://github.com/${name}`
          }
        );
      } else {
        return createErrorResponse(
          `Failed to create repository: ${result.stderr}`,
          { name, options }
        );
      }
    } catch (error) {
      logger.logError(error, { 
        operation: 'gh-repo-create',
        name,
        options 
      });
      return createErrorResponse(
        `Repository creation failed: ${error.message}`
      );
    }
  }

  /**
   * Create a pull request
   * @param {Object} options - Pull request options
   * @returns {Promise<Object>} Pull request result
   */
  async createPullRequest(options = {}) {
    const {
      title,
      body = '',
      base = 'main',
      head = null, // current branch if null
      draft = false,
      assignees = [],
      reviewers = [],
      labels = [],
      milestone = null
    } = options;

    if (!title) {
      return createErrorResponse('Pull request title is required');
    }

    try {
      logger.info('Creating pull request', { title, base, head });

      const args = ['pr', 'create', '--title', title];
      
      if (body) args.push('--body', body);
      if (base) args.push('--base', base);
      if (head) args.push('--head', head);
      if (draft) args.push('--draft');
      
      if (assignees.length > 0) {
        args.push('--assignee', assignees.join(','));
      }
      
      if (reviewers.length > 0) {
        args.push('--reviewer', reviewers.join(','));
      }
      
      if (labels.length > 0) {
        args.push('--label', labels.join(','));
      }
      
      if (milestone) {
        args.push('--milestone', milestone);
      }

      const result = await commandExecutor.executeGitHub(args, {
        timeout: 30000
      });

      if (result.success) {
        // Extract PR URL from output
        const prUrl = result.stdout.trim();
        
        return createSuccessResponse(
          `Pull request created successfully`,
          {
            title,
            url: prUrl,
            base,
            head: head || 'current branch',
            draft
          }
        );
      } else {
        return createErrorResponse(
          `Failed to create pull request: ${result.stderr}`,
          { title, options }
        );
      }
    } catch (error) {
      logger.logError(error, {
        operation: 'gh-pr-create',
        title,
        options
      });
      return createErrorResponse(
        `Pull request creation failed: ${error.message}`
      );
    }
  }

  /**
   * List pull requests
   * @param {Object} options - Listing options
   * @returns {Promise<Object>} Pull requests list
   */
  async listPullRequests(options = {}) {
    const {
      state = 'open', // 'open', 'closed', 'merged', 'all'
      limit = 10,
      author = null,
      assignee = null,
      label = null
    } = options;

    try {
      const args = ['pr', 'list', '--state', state, '--limit', limit.toString()];
      
      if (author) args.push('--author', author);
      if (assignee) args.push('--assignee', assignee);
      if (label) args.push('--label', label);
      
      args.push('--json', 'number,title,author,state,createdAt,url');

      const result = await commandExecutor.executeGitHub(args, {
        timeout: 15000
      });

      if (result.success) {
        const pullRequests = JSON.parse(result.stdout);
        
        const columns = [
          { key: 'number', header: '#' },
          { key: 'title', header: 'Title' },
          { key: 'author', header: 'Author', formatter: (author) => author.login },
          { key: 'state', header: 'State' },
          { key: 'createdAt', header: 'Created', formatter: (date) => new Date(date).toLocaleDateString() }
        ];

        return createTableResponse(
          pullRequests,
          columns,
          `Pull Requests (${state})`
        );
      } else {
        return createErrorResponse(
          `Failed to list pull requests: ${result.stderr}`
        );
      }
    } catch (error) {
      logger.logError(error, {
        operation: 'gh-pr-list',
        options
      });
      return createErrorResponse(
        `Failed to list pull requests: ${error.message}`
      );
    }
  }

  /**
   * Create a release
   * @param {string} tag - Release tag
   * @param {Object} options - Release options
   * @returns {Promise<Object>} Release result
   */
  async createRelease(tag, options = {}) {
    const {
      title = tag,
      notes = '',
      draft = false,
      prerelease = false,
      target = null, // branch/commit, defaults to default branch
      generateNotes = false
    } = options;

    if (!tag) {
      return createErrorResponse('Release tag is required');
    }

    try {
      logger.info('Creating GitHub release', { tag, title });

      const args = ['release', 'create', tag, '--title', title];
      
      if (notes) {
        args.push('--notes', notes);
      } else if (generateNotes) {
        args.push('--generate-notes');
      }
      
      if (draft) args.push('--draft');
      if (prerelease) args.push('--prerelease');
      if (target) args.push('--target', target);

      const result = await commandExecutor.executeGitHub(args, {
        timeout: 30000
      });

      if (result.success) {
        return createSuccessResponse(
          `Release ${tag} created successfully`,
          {
            tag,
            title,
            draft,
            prerelease,
            url: result.stdout.trim()
          }
        );
      } else {
        return createErrorResponse(
          `Failed to create release: ${result.stderr}`,
          { tag, options }
        );
      }
    } catch (error) {
      logger.logError(error, {
        operation: 'gh-release-create',
        tag,
        options
      });
      return createErrorResponse(
        `Release creation failed: ${error.message}`
      );
    }
  }

  /**
   * List releases
   * @param {Object} options - Listing options
   * @returns {Promise<Object>} Releases list
   */
  async listReleases(options = {}) {
    const {
      limit = 10,
      excludeDrafts = false,
      excludePrereleases = false
    } = options;

    try {
      const args = ['release', 'list', '--limit', limit.toString()];
      
      if (excludeDrafts) args.push('--exclude-drafts');
      if (excludePrereleases) args.push('--exclude-prereleases');
      
      args.push('--json', 'tagName,name,publishedAt,isDraft,isPrerelease,url');

      const result = await commandExecutor.executeGitHub(args, {
        timeout: 15000
      });

      if (result.success) {
        const releases = JSON.parse(result.stdout);
        
        const columns = [
          { key: 'tagName', header: 'Tag' },
          { key: 'name', header: 'Name' },
          { key: 'publishedAt', header: 'Published', formatter: (date) => date ? new Date(date).toLocaleDateString() : 'Draft' },
          { key: 'isDraft', header: 'Draft', formatter: (draft) => draft ? 'Yes' : 'No' },
          { key: 'isPrerelease', header: 'Prerelease', formatter: (pre) => pre ? 'Yes' : 'No' }
        ];

        return createTableResponse(
          releases,
          columns,
          'Releases'
        );
      } else {
        return createErrorResponse(
          `Failed to list releases: ${result.stderr}`
        );
      }
    } catch (error) {
      logger.logError(error, {
        operation: 'gh-release-list',
        options
      });
      return createErrorResponse(
        `Failed to list releases: ${error.message}`
      );
    }
  }

  /**
   * Get repository information
   * @param {string} repository - Repository (owner/repo format, optional)
   * @returns {Promise<Object>} Repository information
   */
  async getRepositoryInfo(repository = null) {
    try {
      const args = ['repo', 'view'];
      
      if (repository) {
        args.push(repository);
      }
      
      args.push('--json', 'name,owner,description,visibility,defaultBranch,createdAt,updatedAt,url,sshUrl,cloneUrl,stargazerCount,forkCount,issues,pullRequests');

      const result = await commandExecutor.executeGitHub(args, {
        timeout: 15000
      });

      if (result.success) {
        const repoInfo = JSON.parse(result.stdout);
        
        let infoText = `Repository: ${repoInfo.owner.login}/${repoInfo.name}\n`;
        infoText += `Description: ${repoInfo.description || 'No description'}\n`;
        infoText += `Visibility: ${repoInfo.visibility}\n`;
        infoText += `Default Branch: ${repoInfo.defaultBranch}\n`;
        infoText += `Stars: ${repoInfo.stargazerCount} | Forks: ${repoInfo.forkCount}\n`;
        infoText += `Issues: ${repoInfo.issues.totalCount} | Pull Requests: ${repoInfo.pullRequests.totalCount}\n`;
        infoText += `Created: ${new Date(repoInfo.createdAt).toLocaleDateString()}\n`;
        infoText += `Updated: ${new Date(repoInfo.updatedAt).toLocaleDateString()}`;

        return createJsonResponse(repoInfo, infoText);
      } else {
        return createErrorResponse(
          `Failed to get repository info: ${result.stderr}`,
          { repository }
        );
      }
    } catch (error) {
      logger.logError(error, {
        operation: 'gh-repo-view',
        repository
      });
      return createErrorResponse(
        `Failed to get repository info: ${error.message}`
      );
    }
  }

  /**
   * Clone a repository
   * @param {string} repository - Repository to clone (owner/repo format)
   * @param {Object} options - Clone options
   * @returns {Promise<Object>} Clone result
   */
  async cloneRepository(repository, options = {}) {
    const {
      directory = null,
      branch = null,
      depth = null
    } = options;

    if (!repository) {
      return createErrorResponse('Repository name is required');
    }

    try {
      logger.info('Cloning GitHub repository', { repository, directory });

      const args = ['repo', 'clone', repository];
      
      if (directory) args.push(directory);
      if (branch) args.push('--', '--branch', branch);
      if (depth) args.push('--', '--depth', depth.toString());

      const result = await commandExecutor.executeGitHub(args, {
        cwd: directory ? process.cwd() : config.getProjectsDir(),
        timeout: 120000 // 2 minutes for clone
      });

      if (result.success) {
        return createSuccessResponse(
          `Repository ${repository} cloned successfully`,
          {
            repository,
            directory: directory || repository.split('/')[1],
            branch: branch || 'default'
          }
        );
      } else {
        return createErrorResponse(
          `Failed to clone repository: ${result.stderr}`,
          { repository, options }
        );
      }
    } catch (error) {
      logger.logError(error, {
        operation: 'gh-repo-clone',
        repository,
        options
      });
      return createErrorResponse(
        `Repository clone failed: ${error.message}`
      );
    }
  }

  /**
   * Fork a repository
   * @param {string} repository - Repository to fork (owner/repo format)
   * @param {Object} options - Fork options
   * @returns {Promise<Object>} Fork result
   */
  async forkRepository(repository, options = {}) {
    const {
      clone = false,
      organization = null
    } = options;

    if (!repository) {
      return createErrorResponse('Repository name is required');
    }

    try {
      logger.info('Forking GitHub repository', { repository });

      const args = ['repo', 'fork', repository];
      
      if (clone) args.push('--clone');
      if (organization) args.push('--org', organization);

      const result = await commandExecutor.executeGitHub(args, {
        timeout: 60000
      });

      if (result.success) {
        return createSuccessResponse(
          `Repository ${repository} forked successfully`,
          {
            original: repository,
            cloned: clone,
            organization: organization || 'personal'
          }
        );
      } else {
        return createErrorResponse(
          `Failed to fork repository: ${result.stderr}`,
          { repository, options }
        );
      }
    } catch (error) {
      logger.logError(error, {
        operation: 'gh-repo-fork',
        repository,
        options
      });
      return createErrorResponse(
        `Repository fork failed: ${error.message}`
      );
    }
  }

  /**
   * Create an issue
   * @param {Object} options - Issue options
   * @returns {Promise<Object>} Issue creation result
   */
  async createIssue(options = {}) {
    const {
      title,
      body = '',
      assignees = [],
      labels = [],
      milestone = null
    } = options;

    if (!title) {
      return createErrorResponse('Issue title is required');
    }

    try {
      logger.info('Creating GitHub issue', { title });

      const args = ['issue', 'create', '--title', title];
      
      if (body) args.push('--body', body);
      
      if (assignees.length > 0) {
        args.push('--assignee', assignees.join(','));
      }
      
      if (labels.length > 0) {
        args.push('--label', labels.join(','));
      }
      
      if (milestone) {
        args.push('--milestone', milestone);
      }

      const result = await commandExecutor.executeGitHub(args, {
        timeout: 30000
      });

      if (result.success) {
        const issueUrl = result.stdout.trim();
        
        return createSuccessResponse(
          `Issue created successfully`,
          {
            title,
            url: issueUrl,
            assignees,
            labels
          }
        );
      } else {
        return createErrorResponse(
          `Failed to create issue: ${result.stderr}`,
          { title, options }
        );
      }
    } catch (error) {
      logger.logError(error, {
        operation: 'gh-issue-create',
        title,
        options
      });
      return createErrorResponse(
        `Issue creation failed: ${error.message}`
      );
    }
  }

  /**
   * Run a custom GitHub CLI command
   * @param {Array} args - GitHub CLI arguments
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Command result
   */
  async runCustomCommand(args, options = {}) {
    try {
      logger.info('Running custom GitHub CLI command', { args });

      const result = await commandExecutor.executeGitHub(args, {
        timeout: options.timeout || 30000,
        ...options
      });

      return createCommandResponse(
        `${this.ghBin} ${args.join(' ')}`,
        result,
        result.executionTime
      );
    } catch (error) {
      logger.logError(error, {
        operation: 'gh-custom-command',
        args
      });
      return createErrorResponse(
        `GitHub CLI command failed: ${error.message}`
      );
    }
  }
}

// Export singleton instance
export const githubManager = new GitHubManager();