# Phase 1 - Control Plane Scaffold and MCP Bridge

## Overview
Create the backend "GUI Control Plane" using NestJS and implement the MCP bridge module that wraps existing MCP tool interfaces.

## Todo List

### NestJS Backend Setup
- [ ] **Initialize NestJS project structure**
  - Create `gui/backend/` directory
  - Initialize NestJS application with TypeScript
  - Setup project structure: controllers, services, modules, dtos
  - Configure environment variables and configuration module
  - Setup hot reload for development

- [ ] **Configure core dependencies**
  - Install and configure Winston logger (reuse existing logger.js patterns)
  - Setup validation with class-validator and class-transformer
  - Configure Swagger/OpenAPI for API documentation
  - Install database dependencies (SQLite initially)
  - Setup health check endpoints

- [ ] **Configure Docker containerization**
  - Create Dockerfile for backend service
  - Create docker-compose.yml for local development
  - Setup volume mounts for logs and database
  - Configure environment variable injection

### MCP Bridge Module
- [ ] **Create MCP bridge service**
  - Implement MCPBridgeService to wrap existing MCP tools
  - Create uniform interface for all MCP tool calls
  - Implement standardized error handling and response transformation
  - Add operation logging and audit trail integration
  - Create retry logic with exponential backoff for failed operations

- [ ] **Map MCP tools to API endpoints**
  - Project operations: create, list, switch, delete
  - Docker operations: start, stop, restart, logs, status
  - WordPress operations: install theme/plugin, configure
  - Research operations: topic research, image finding
  - Git operations: status, commit, push
  - GitHub operations: PRs, releases, repository info
  - Testing operations: link tests, SEO validation

- [ ] **Implement response standardization**
  - Transform existing MCP response formats to consistent API responses
  - Preserve existing `content[0].text` compatibility for backwards compatibility
  - Add structured data in `data` field for GUI consumption
  - Implement error response standardization with proper HTTP status codes

### Health and Monitoring
- [ ] **Create comprehensive health checks**
  - `/health`: Basic server health
  - `/health/mcp`: MCP tools availability and response time
  - `/health/docker`: Docker daemon connectivity
  - `/health/database`: SQLite database connectivity
  - `/health/dependencies`: External services (Jina API, GitHub CLI, etc.)

- [ ] **Implement monitoring endpoints**
  - `/metrics`: Prometheus-compatible metrics
  - `/status`: System status dashboard data
  - Operation counts, response times, error rates
  - Memory usage, database size, log file sizes

### Authentication Stub (Development)
- [ ] **Implement development authentication bypass**
  - Create AuthModule with configurable bypass mode
  - Environment flag `BYPASS_AUTH_DEV=true` for development
  - Mock user context with configurable roles (Admin, Editor, Viewer)
  - JWT token structure preparation for future Authentik integration
  - Request context injection for user information

- [ ] **Create RBAC foundation**
  - Define role decorators and guards
  - Implement route protection based on roles
  - Create user context service for role-based access
  - Setup audit logging for authentication events

### Database Integration
- [ ] **Integrate existing SQLite database manager**
  - Import and configure sqlite-database-manager from lib/
  - Create NestJS database module wrapper
  - Implement database health checks and connection pooling
  - Setup database migration system for GUI-specific tables

- [ ] **Create GUI-specific database schema**
  - User sessions table (for future multi-user support)
  - Audit log table for user actions
  - System configuration table
  - Cache tables for expensive operations

### API Structure and Documentation
- [ ] **Design RESTful API structure**
  - `/api/v1/projects/*`: Project management endpoints
  - `/api/v1/docker/*`: Docker orchestration endpoints
  - `/api/v1/wordpress/*`: WordPress management endpoints
  - `/api/v1/research/*`: Research and media endpoints
  - `/api/v1/git/*`: Git and GitHub endpoints
  - `/api/v1/tests/*`: Testing and validation endpoints
  - `/api/v1/system/*`: System management and health

- [ ] **Implement OpenAPI/Swagger documentation**
  - Auto-generate API documentation
  - Add request/response examples
  - Document authentication requirements
  - Create API client generation scripts

### Error Handling and Logging
- [ ] **Implement unified error handling**
  - Global exception filter for consistent error responses
  - MCP error translation to HTTP status codes
  - Validation error handling and user-friendly messages
  - Rate limiting and request timeout handling

- [ ] **Setup structured logging**
  - Integrate with existing logger.js patterns
  - Request/response logging with correlation IDs
  - Operation audit trails with user attribution
  - Performance logging for slow operations
  - Error logging with stack traces and context

### Testing Framework
- [ ] **Setup testing infrastructure**
  - Unit tests for services and controllers
  - Integration tests for MCP bridge functionality
  - Health check endpoint tests
  - Mock MCP responses for testing
  - Test database setup and teardown

- [ ] **Create test scenarios**
  - Happy path tests for all major operations
  - Error condition tests (MCP failures, Docker down, etc.)
  - Authentication bypass testing
  - Performance and load testing setup

### Configuration Management
- [ ] **Environment configuration**
  - Development, staging, production configurations
  - Feature flag management
  - Secret management integration preparation
  - Configuration validation on startup

- [ ] **External service configuration**
  - MCP tool paths and timeouts
  - Database connection settings
  - Logging configuration
  - Health check intervals and thresholds

## Acceptance Criteria
- [ ] NestJS backend runs successfully in Docker container
- [ ] All MCP tools can be invoked through REST API endpoints
- [ ] Health checks return accurate system status
- [ ] Authentication bypass works correctly in development mode
- [ ] Comprehensive API documentation available
- [ ] Unified error handling and logging operational
- [ ] Test suite passes with good coverage
- [ ] Database integration working with existing SQLite manager

## Deliverables
- [ ] Working NestJS backend service
- [ ] MCP bridge module with full tool coverage
- [ ] OpenAPI specification and documentation
- [ ] Docker containerization setup
- [ ] Test suite with CI/CD integration
- [ ] Health check and monitoring endpoints

## Success Metrics
- All MCP operations accessible via REST API
- Response times under 500ms for non-blocking operations
- Test coverage above 80%
- Zero critical security vulnerabilities
- Documentation complete and accurate