# Phase 0.5 - Reverse Proxy and Identity Design

## Overview
Design the reverse proxy architecture and identity management system for HIPAA compliance and security.

## Todo List

### Reverse Proxy Selection and Design
- [ ] **Evaluate and select reverse proxy**
  - Compare Traefik vs NGINX for dynamic service discovery
  - Evaluate Caddy as alternative option
  - Document pros/cons for mixed Docker+VM environments
  - **Recommendation**: Traefik for dynamic discovery, NGINX for performance-critical deployments

- [ ] **Design network architecture**
  - Define network zones: Public, App, Data, PHI boundary
  - Document traffic flow: Internet → Reverse Proxy → GUI Control Plane → MCP → Services
  - Plan for Docker networks and OpenNebula virtual networks
  - Define east-west vs north-south traffic patterns

- [ ] **Design TLS and certificate management**
  - TLS 1.2+ enforcement, modern cipher suites
  - Certificate automation: Let's Encrypt for dev/staging
  - Enterprise CA integration for production
  - mTLS for internal service-to-service communication
  - HSTS, secure headers, CSP policies

### Identity and Access Management
- [ ] **Design Authentik integration**
  - OIDC provider configuration for GUI application
  - ForwardAuth outpost for route-level protection
  - SCIM/user provisioning if needed for multi-tenancy
  - Session management: JWT lifecycle, refresh tokens, logout

- [ ] **Define authentication flows**
  - Development bypass mode (feature flag: `BYPASS_AUTH_DEV=true`)
  - OIDC authorization code flow for production
  - MFA requirements and policy enforcement
  - Session timeout and inactivity policies

- [ ] **Design RBAC policy matrix**
  - Admin role: Full system access, user management, destructive operations
  - Editor role: Content creation, plugin/theme management, testing
  - Viewer role: Read-only access to projects, logs, status
  - Map roles to specific routes and API endpoints

### Security Architecture
- [ ] **Document trust boundaries**
  - DMZ: Reverse proxy, Authentik outpost
  - Application zone: GUI Control Plane
  - Service zone: MCP services, Docker hosts
  - Data zone: Database, file storage, backups

- [ ] **Design WAF and security policies**
  - Rate limiting rules (per-IP, per-user, per-endpoint)
  - OWASP CRS integration with ModSecurity or Traefik rules
  - IP allowlisting for admin interfaces
  - DDoS protection and request size limits

- [ ] **Plan audit and compliance controls**
  - Access logging format and retention
  - Authentication event logging
  - Failed attempt monitoring and alerting
  - Log immutability and tamper detection

### Route Protection Design
- [ ] **Define route protection matrix**
  - Public routes: `/health`, `/login`, `/logout`
  - Admin-only routes: `/admin/*`, `/users/*`, `/system/*`
  - Editor routes: `/projects/*/wp/*`, `/research/*`, `/tests/*`
  - Viewer routes: `/dashboard`, `/projects/*/status`, `/logs/*`

- [ ] **Design per-project access control**
  - Project-level permissions (assigned projects per user)
  - PHI-bearing project isolation
  - WordPress site subdomain/path routing with protection
  - VM-hosted site routing and protection

### HIPAA Compliance Architecture
- [ ] **Document PHI handling boundaries**
  - Classify WordPress instances as PHI-bearing or PHI-adjacent
  - Network isolation for PHI-containing projects
  - Encryption requirements: at-rest, in-transit, in-memory
  - Access control matrix for PHI access

- [ ] **Design audit controls**
  - Comprehensive access logging with user attribution
  - Authentication and authorization event logging
  - System change auditing and approval workflows
  - Log retention policies (6+ years for HIPAA)

- [ ] **Plan breach containment**
  - Network segmentation and microsegmentation
  - Automated incident response triggers
  - Emergency access procedures and break-glass accounts
  - Forensic data collection and preservation

### Configuration Management
- [ ] **Design configuration as code**
  - Traefik dynamic configuration via Docker labels and file provider
  - Authentik configuration via Terraform or declarative YAML
  - Environment-specific overrides and secrets management
  - Configuration validation and drift detection

- [ ] **Plan secrets management**
  - Development: Local environment variables, Authentik dev instance
  - Production: External secret manager (Vault, AWS Secrets, 1Password)
  - Certificate private key protection
  - Database credentials and API key rotation

### OpenNebula Integration Planning
- [ ] **Design VM routing integration**
  - VM endpoint discovery and registration with reverse proxy
  - Dynamic backend configuration for VM-hosted WordPress
  - Health checks and failover for VM instances
  - Network policy enforcement for VM-to-VM communication

- [ ] **Plan VM security boundaries**
  - VM network isolation and micro-segmentation
  - VM-level firewall rules and IDS/IPS
  - VM disk encryption and secure boot
  - VM backup and disaster recovery with encryption

## Acceptance Criteria
- [ ] Reverse proxy technology selected and justified
- [ ] Complete network and security architecture documented
- [ ] Route protection matrix defined and approved
- [ ] HIPAA compliance controls documented
- [ ] Development authentication bypass strategy confirmed
- [ ] Configuration management approach defined

## Deliverables
- [ ] Network architecture diagram
- [ ] Security controls matrix
- [ ] Route protection specification
- [ ] HIPAA compliance checklist
- [ ] Configuration templates (non-functional samples)

## Success Metrics
- Security architecture approved by stakeholders
- HIPAA compliance requirements clearly defined
- Clear understanding of development vs production security models
- Foundation ready for Phase 1.5 implementation