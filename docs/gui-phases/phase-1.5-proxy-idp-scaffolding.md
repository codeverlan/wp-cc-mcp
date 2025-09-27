# Phase 1.5 - Proxy/IdP Scaffolding (Non-Production)

## Overview
Implement the reverse proxy and identity provider infrastructure for development and testing, with authentication bypass for development mode.

## Todo List

### Traefik Reverse Proxy Setup
- [ ] **Install and configure Traefik**
  - Create Traefik configuration files (traefik.yml, dynamic config)
  - Setup Docker Compose service for Traefik
  - Configure service discovery via Docker labels
  - Setup file provider for static configuration

- [ ] **Configure TLS and certificates**
  - Setup Let's Encrypt ACME challenge for dev/staging domains
  - Configure automatic certificate renewal
  - Implement TLS 1.2+ enforcement with modern cipher suites
  - Setup HSTS headers and secure cookie policies

- [ ] **Implement basic routing rules**
  - Route GUI frontend traffic to Next.js application
  - Route API traffic to NestJS backend
  - Configure health check endpoints routing
  - Setup static file serving for assets

### Authentik Identity Provider (Development)
- [ ] **Deploy Authentik for development**
  - Setup Authentik Docker Compose service
  - Configure development database (PostgreSQL or SQLite)
  - Initialize admin account and basic configuration
  - Setup development SMTP for testing (MailHog or similar)

- [ ] **Configure OIDC provider**
  - Create OIDC application for GUI frontend
  - Configure authorization code flow with PKCE
  - Setup JWT token configuration and signing keys
  - Configure session and token lifetimes

- [ ] **Setup ForwardAuth outpost**
  - Deploy Authentik outpost for ForwardAuth integration
  - Configure Traefik ForwardAuth middleware
  - Setup route protection rules and bypasses
  - Configure development authentication bypass

### Basic Security Headers and WAF
- [ ] **Implement security headers**
  - Content Security Policy (CSP) headers
  - X-Frame-Options, X-Content-Type-Options
  - Referrer-Policy and Permissions-Policy
  - Remove sensitive server headers

- [ ] **Configure basic WAF rules**
  - Rate limiting by IP and endpoint
  - Request size limits and timeout configuration
  - Basic OWASP CRS rules implementation
  - IP allowlisting for admin interfaces

- [ ] **Setup request logging**
  - Configure access log format with user attribution
  - Setup log rotation and retention policies
  - Implement request correlation IDs
  - Configure error response logging

### Development Authentication Flow
- [ ] **Implement bypass mode**
  - Environment flag `BYPASS_AUTH_DEV=true` to skip authentication
  - Mock user injection with configurable roles
  - Development-only routes for user context switching
  - Clear indication of bypass mode in UI

- [ ] **Test authentication flows**
  - OIDC login/logout flow testing
  - Token refresh and validation testing
  - Role-based access control testing
  - Session timeout and expiration testing

### Route Protection Implementation
- [ ] **Configure route protection matrix**
  - Public routes: `/health`, `/api/health`, login/logout
  - Admin routes: `/admin/*`, `/api/v1/system/*`
  - Editor routes: `/projects/*`, `/api/v1/wordpress/*`, `/api/v1/research/*`
  - Viewer routes: `/dashboard`, `/logs/*`, read-only API endpoints

- [ ] **Implement per-project access control**
  - Project assignment and access validation
  - WordPress site protection (subdomain/path routing)
  - API endpoint protection based on project access
  - Audit logging for access attempts

### Health Checks and Monitoring
- [ ] **Setup proxy health checks**
  - Traefik dashboard and API health endpoints
  - Backend service health check integration
  - Certificate expiration monitoring
  - Service discovery validation

- [ ] **Configure monitoring and alerting**
  - Basic metrics collection (request rates, response times)
  - Error rate monitoring and thresholds
  - Certificate expiration alerting
  - Service unavailability detection

### Configuration Management
- [ ] **Implement configuration as code**
  - Traefik dynamic configuration via Docker labels
  - Authentik configuration via environment variables
  - Development docker-compose with all services
  - Configuration validation and health checks

- [ ] **Setup secrets management**
  - Development secrets via environment files
  - Certificate storage and protection
  - Database credentials management
  - API key and token protection

### Testing and Validation
- [ ] **Test proxy functionality**
  - Route resolution and forwarding
  - TLS termination and security headers
  - Authentication bypass in development mode
  - Error handling and failover scenarios

- [ ] **Test identity provider integration**
  - OIDC flow end-to-end testing
  - ForwardAuth middleware validation
  - Role-based access control verification
  - Session management and logout testing

### Documentation and Runbooks
- [ ] **Create deployment documentation**
  - Development environment setup guide
  - Configuration reference and examples
  - Troubleshooting guide for common issues
  - Security considerations and best practices

- [ ] **Create operational runbooks**
  - Certificate renewal procedures
  - Service restart and recovery procedures
  - Log analysis and debugging guides
  - Performance tuning recommendations

## Acceptance Criteria
- [ ] Traefik successfully routes traffic to GUI Control Plane
- [ ] TLS certificates automatically provisioned and renewed
- [ ] Authentik OIDC flow works end-to-end
- [ ] ForwardAuth protection works for secured routes
- [ ] Authentication bypass works correctly in development
- [ ] Security headers properly configured
- [ ] Health checks and monitoring operational
- [ ] Configuration deployed via Infrastructure as Code

## Deliverables
- [ ] Traefik configuration and deployment files
- [ ] Authentik setup and configuration
- [ ] Docker Compose stack for development
- [ ] Route protection configuration
- [ ] Monitoring and health check setup
- [ ] Documentation and operational guides

## Success Metrics
- 100% of GUI traffic properly routed through proxy
- TLS grade A+ rating on SSL Labs test
- Authentication flows work without manual intervention
- Zero security vulnerabilities in proxy configuration
- Complete documentation for operations team

## Dependencies
- Phase 1 (Control Plane) must be completed
- Domain names and DNS configuration available
- Development infrastructure provisioned