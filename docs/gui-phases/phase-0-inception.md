# Phase 0 - Inception and Governance

## Overview
Define goals, architecture, and governance model for the wp-cc-mcp GUI system.

## Todo List

### Architecture Definition
- [ ] **Document system architecture**
  - Define high-level component diagram (GUI frontend, Control Plane backend, MCP bridge, reverse proxy, IdP)
  - Specify technology stack: Next.js + React + TypeScript, NestJS backend, WebSockets for real-time
  - Document data flow: User → Reverse Proxy → GUI → Control Plane → MCP Tools
  - Define deployment models: Docker containers, future VM support via OpenNebula

- [ ] **Define security model and HIPAA alignment**
  - RBAC roles: Admin (full access), Editor (content + plugins/themes + tests), Viewer (read-only)
  - Authentication bypass for development (feature flag)
  - Document PHI handling guidelines for WordPress sites
  - Define audit logging requirements and retention policies

- [ ] **Approve technology choices**
  - Frontend: Next.js (App Router) + React + TypeScript
  - UI Framework: TailwindCSS + shadcn/ui
  - Backend: NestJS + TypeScript
  - Database: SQLite initially (existing sqlite-database-manager), migration path to Postgres
  - Real-time: WebSocket (Socket.IO) or Server-Sent Events
  - Reverse Proxy: Traefik (recommended) or NGINX
  - Identity Provider: Authentik (OIDC + ForwardAuth)

### Project Setup
- [ ] **Create project structure**
  - Create `gui/` directory in wp-cc-mcp repo
  - Setup monorepo structure: `gui/frontend/`, `gui/backend/`, `gui/docs/`
  - Initialize package.json for both frontend and backend
  - Setup shared TypeScript configurations

- [ ] **Define development environment**
  - Docker Compose for local development stack
  - Environment variables and configuration management
  - Development database seeding and migration scripts
  - Hot reload setup for both frontend and backend

### Goals and Non-Goals
- [ ] **Document project goals**
  - Primary: Web-based GUI for all MCP functionality
  - Secondary: Desktop app support via Tauri/Electron
  - Future: OpenNebula VM orchestration support
  - Performance: Handle 10+ concurrent WordPress projects

- [ ] **Document non-goals**
  - Not replacing MCP tools - GUI orchestrates via MCP
  - Not building WordPress editing features (use existing WP admin)
  - Not handling WordPress content storage (focus on management)

### Acceptance Criteria
- [ ] Architecture document approved and committed
- [ ] Security model and RBAC roles approved
- [ ] Technology stack confirmed
- [ ] Feature flags defined for optional components (OpenNebula, advanced research)
- [ ] Development environment requirements documented
- [ ] All stakeholders aligned on project scope and timeline

### Environment Configuration
- [ ] **Define feature flags**
  - `ENABLE_OPENNEBULA`: VM orchestration features
  - `ENABLE_ADVANCED_RESEARCH`: Jina AI advanced features
  - `BYPASS_AUTH_DEV`: Skip authentication in development
  - `ENABLE_STREAMING_LOGS`: Real-time log streaming
  - `ENABLE_AUDIT_LOGGING`: Detailed audit trail

- [ ] **Document environment types**
  - Local development: Docker Compose, auth bypass
  - Staging: Full stack with Authentik, test data
  - Production: HIPAA-compliant deployment, full audit logging

## Success Metrics
- Stakeholder approval on architecture decisions
- Clear understanding of security requirements
- Development environment ready for Phase 1
- Feature flags and configuration strategy defined