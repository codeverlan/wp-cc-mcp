# Phase 2 - Frontend Scaffold and Global UX

## Overview
Create the Next.js frontend application with TailwindCSS and shadcn/ui, implement the core layout and navigation, and establish WebSocket connectivity for real-time features.

## Todo List

### Next.js Frontend Setup
- [ ] **Initialize Next.js project**
  - Create `gui/frontend/` directory with Next.js 14+ (App Router)
  - Setup TypeScript configuration with strict mode
  - Configure ESLint and Prettier for code formatting
  - Setup Husky pre-commit hooks for quality gates

- [ ] **Configure core dependencies**
  - Install and configure TailwindCSS with custom design tokens
  - Setup shadcn/ui component library with custom theme
  - Install React Query (TanStack Query) for data fetching
  - Setup Zustand for client-side state management
  - Configure React Hook Form with Zod validation

- [ ] **Setup build and development tooling**
  - Configure Next.js for production builds with optimization
  - Setup hot reload and fast refresh for development
  - Configure bundle analyzer and performance monitoring
  - Setup Storybook for component development and documentation

### UI Design System and Components
- [ ] **Create design system foundation**
  - Define color palette, typography, and spacing scales
  - Create component variants for different states and sizes
  - Setup responsive design breakpoints and grid system
  - Define animation and transition standards

- [ ] **Build core UI components**
  - Layout components: Header, Sidebar, Main content area
  - Navigation components: Menu, breadcrumbs, tabs
  - Form components: Input, Select, Textarea, Checkbox, Radio
  - Feedback components: Toast, Modal, Alert, Loading states
  - Data display: Table, Card, Badge, Status indicators

- [ ] **Implement theme and customization**
  - Dark/light theme toggle with system preference detection
  - User preference persistence in localStorage
  - CSS custom properties for dynamic theming
  - Responsive design for mobile, tablet, and desktop

### Global Layout and Navigation
- [ ] **Create application shell**
  - Main layout component with sidebar navigation
  - Header with user menu, notifications, and global actions
  - Responsive sidebar with collapsible navigation
  - Footer with system information and links

- [ ] **Implement navigation structure**
  - Dashboard: System overview and recent activity
  - Projects: Project listing and management
  - Operations: Docker/VM orchestration panel
  - WordPress: Theme, plugin, and content management
  - Research: Jina AI research and media tools
  - Testing: Link, SEO, and comprehensive testing
  - Git/Deploy: Version control and deployment tools
  - Settings: System configuration and user preferences

- [ ] **Setup routing and navigation state**
  - Next.js App Router configuration with nested layouts
  - Active navigation state management
  - Breadcrumb generation from route hierarchy
  - URL state synchronization for filters and preferences

### Authentication UI (Development Bypass)
- [ ] **Create authentication components**
  - Login page with OIDC integration (disabled in dev mode)
  - User profile dropdown with role indication
  - Logout functionality and session management
  - Development mode user switcher for testing roles

- [ ] **Implement role-based UI**
  - Component-level role guards and conditional rendering
  - Navigation items filtered by user permissions
  - Action buttons enabled/disabled based on roles
  - Clear visual indication of current user role and project access

- [ ] **Setup session management**
  - JWT token storage and refresh logic
  - Automatic logout on token expiration
  - Session state synchronization across tabs
  - Development bypass with mock user context

### Real-time Connectivity
- [ ] **Implement WebSocket client**
  - Socket.IO client configuration with reconnection logic
  - Connection state management and error handling
  - Event subscription and unsubscription management
  - Message queuing for offline scenarios

- [ ] **Create real-time UI components**
  - Live log viewer with auto-scroll and search
  - Real-time status indicators for projects and services
  - Progress bars for long-running operations
  - Notification system for events and alerts

- [ ] **Setup event handling**
  - Docker container status updates
  - WordPress operation progress and completion
  - System health and resource monitoring
  - User activity and audit events

### Global State Management
- [ ] **Configure React Query**
  - API client configuration with base URL and interceptors
  - Query and mutation configurations with error handling
  - Caching strategies for different data types
  - Optimistic updates for immediate UI feedback

- [ ] **Setup Zustand stores**
  - User context and authentication state
  - Navigation and UI preferences
  - Real-time connection state
  - Global loading and error states

- [ ] **Implement data fetching patterns**
  - Custom hooks for API operations
  - Error boundaries for graceful error handling
  - Loading states and skeleton components
  - Retry logic and offline support

### Global UI Systems
- [ ] **Create toast notification system**
  - Success, error, warning, and info toast types
  - Auto-dismiss and manual dismiss options
  - Queue management for multiple notifications
  - Accessibility features (screen reader support)

- [ ] **Implement modal system**
  - Confirmation modals for destructive actions
  - Form modals for quick data entry
  - Full-screen modals for complex workflows
  - Focus management and keyboard navigation

- [ ] **Setup loading and error states**
  - Global loading indicators for full-page operations
  - Skeleton loaders for individual components
  - Error boundaries with retry and report options
  - Empty states with helpful guidance

### Performance and Accessibility
- [ ] **Implement performance optimizations**
  - Code splitting and lazy loading for large components
  - Image optimization and lazy loading
  - Bundle size monitoring and optimization
  - Core Web Vitals measurement and improvement

- [ ] **Ensure accessibility compliance**
  - WCAG 2.1 AA compliance for all components
  - Keyboard navigation support throughout the application
  - Screen reader compatibility and ARIA labels
  - Color contrast and focus indicators

### Testing Framework
- [ ] **Setup testing infrastructure**
  - Jest and React Testing Library configuration
  - Component testing for all UI components
  - Integration testing for user flows
  - Visual regression testing with Chromatic or similar

- [ ] **Create test utilities**
  - Mock providers for React Query and Zustand
  - Custom render function with providers
  - Mock WebSocket implementation for testing
  - Test data factories for consistent test data

### Development Tools
- [ ] **Setup development tooling**
  - Storybook for component development and documentation
  - React DevTools configuration
  - Bundle analyzer for performance monitoring
  - Accessibility testing tools integration

- [ ] **Create developer documentation**
  - Component usage guidelines and examples
  - State management patterns and conventions
  - API integration patterns and error handling
  - Performance optimization guidelines

## Acceptance Criteria
- [ ] Next.js application builds and runs without errors
- [ ] All core UI components functional and accessible
- [ ] Navigation works correctly across all sections
- [ ] WebSocket connection establishes and reconnects properly
- [ ] Authentication bypass works in development mode
- [ ] Toast and modal systems operational
- [ ] Responsive design works on all device sizes
- [ ] Performance meets Core Web Vitals thresholds
- [ ] Test suite passes with good coverage

## Deliverables
- [ ] Working Next.js frontend application
- [ ] Complete UI component library with Storybook
- [ ] Global layout and navigation system
- [ ] Real-time connectivity implementation
- [ ] Authentication UI with development bypass
- [ ] Comprehensive test suite
- [ ] Performance and accessibility optimizations

## Success Metrics
- Lighthouse score >90 for all metrics
- Zero accessibility violations in automated tests
- Component library with 100% Storybook coverage
- WebSocket connection <1s establishment time
- Build time <30s for development builds
- Test suite runs in <10s with >85% coverage

## Dependencies
- Phase 1 (Control Plane) must provide API endpoints
- Phase 1.5 (Proxy) must route frontend traffic
- Design system tokens and guidelines approved