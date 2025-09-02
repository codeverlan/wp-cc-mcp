# WordPress Natural Language Interface Guide

## Overview

The WordPress MCP now supports complete natural language control. You can build, design, and manage WordPress sites using plain English commands instead of technical tools.

## Three Ways to Use Natural Language

### 1. Interactive Mode
Start an interactive session where you can type commands naturally:

```bash
node natural-language-interface.js
# OR
./wp-natural
```

Then type commands like:
- "Create a page called About Us"
- "Install Yoast SEO"
- "Add a contact form"
- "Write a blog post about parenting tips"

### 2. Single Command Mode
Execute a single natural language command:

```bash
./wp-natural create a blog post about healthy recipes
./wp-natural install contact form plugin
./wp-natural add an about page with company information
```

### 3. AI Assistant Mode
Describe your entire website and let AI build it:

```bash
node ai-assistant.js "I want a parenting blog with SEO, contact forms, and social media integration"
node ai-assistant.js "Build a business website with portfolio and team pages" my-business
node ai-assistant.js "Create an online store for handmade jewelry" jewelry-store
```

## Supported Natural Language Commands

### Project Management
- "Create a new project called [name]"
- "Create a WordPress site for [topic]"
- "Start a new website about [subject]"
- "Switch to project [name]"
- "Use the [name] project"
- "Open [name] website"

### Content Creation

#### Pages
- "Create a page called [title]"
- "Add an about page"
- "Make a contact page"
- "Create a services page"
- "Add a team page"
- "I need a FAQ page"
- "Create a portfolio page"

#### Blog Posts
- "Write a blog post about [topic]"
- "Create an article about [subject]"
- "Publish a post on [topic]"
- "Blog about [subject]"
- "Add content about [topic]"

### Design & Features

#### Themes
- "Install the [name] theme"
- "Change theme to [name]"
- "Use a blog theme"
- "I want a business theme"
- "Apply a minimal theme"
- "Switch to a portfolio theme"

#### Plugins by Feature
- "Add a contact form" → Contact Form 7
- "Enable SEO" → Yoast SEO
- "Add security" → Wordfence
- "Install caching" → WP Super Cache
- "Add a gallery" → NextGEN Gallery
- "Enable analytics" → Google Analytics
- "Add social media icons" → Social Icons
- "Install backup plugin" → UpdraftPlus
- "Add an online store" → WooCommerce
- "Enable spam protection" → Akismet

### Research & Media
- "Research about [topic]"
- "Find information on [subject]"
- "Get content ideas for [topic]"
- "Find images of [subject]"
- "Download photos of [topic]"
- "Search for pictures about [subject]"

### Docker Control
- "Start the website"
- "Stop the website"
- "Launch WordPress"
- "Shut down the containers"
- "Bring the site online"
- "Take the site offline"

### Navigation
- "Create a navigation menu with home, about, services, contact"
- "Add a main menu"
- "Set up navigation"
- "Create menu with [page list]"

### Version Control
- "Save my changes"
- "Commit my work"
- "Save progress"
- "Show what's changed"
- "Check git status"
- "Commit with message [message]"

### Testing & Deployment (Phase-Dependent)
When testing/deployment phases are active:
- "Test all links"
- "Check for broken links"
- "Validate SEO"
- "Check meta tags"
- "Deploy to production"
- "Push to SiteGround"
- "Make the site live"
- "Publish the website"

## AI Assistant Workflows

The AI Assistant can build complete websites from descriptions:

### Parenting Website
Triggered by: "parenting", "family", "children"
```bash
node ai-assistant.js "I need a parenting website with resources and blog"
```
Creates:
- Home, About, Resources pages
- Age-based content sections
- Blog with parenting topics
- SEO and contact forms

### Blog Website
Triggered by: "blog", "personal site"
```bash
node ai-assistant.js "Create a personal blog about travel"
```
Creates:
- Blog-focused theme
- SEO optimization
- Social sharing
- Comment system
- Navigation menu

### Business Website
Triggered by: "business", "company", "corporate"
```bash
node ai-assistant.js "Build a business website with portfolio"
```
Creates:
- Professional theme
- Services page
- Portfolio section
- Team page
- Contact forms
- Google Maps

### E-commerce Website
Triggered by: "shop", "store", "sell", "ecommerce"
```bash
node ai-assistant.js "Create an online store for crafts"
```
Creates:
- WooCommerce installation
- Storefront theme
- Payment processing
- Product pages
- Cart and checkout

## Advanced Natural Language Features

### Context Awareness
The system remembers:
- Current project
- Last created page
- Last installed plugin
- Last created post

### Smart Interpretation
The system understands variations:
- "I need SEO" = Install Yoast SEO
- "Add security" = Install Wordfence
- "I want a shop" = Install WooCommerce
- "Make it fast" = Install caching plugin

### Feature Detection
Mention features naturally:
- "with contact forms and SEO"
- "including gallery and social media"
- "with newsletter signup"
- "that has analytics tracking"

### Style Preferences
Describe the look:
- "modern design"
- "minimal style"
- "colorful theme"
- "classic appearance"

## Phase Management

Control which tools are active:

```json
// mcp-phases.json
{
  "current_phase": "design"  // Change to: development, testing, deployment
}
```

### Design Phase Tools
- Page/post creation
- Theme installation
- Plugin management
- Content generation
- Image finding

### Development Phase Tools
- Custom code editing
- Git operations
- Database management
- Configuration

### Testing Phase Tools
- Link validation
- SEO checking
- Performance testing
- Comprehensive tests

### Deployment Phase Tools
- SiteGround integration
- Production deployment
- Cache management
- Database migration

## Examples

### Complete Website Creation
```bash
# One command to build entire site
node ai-assistant.js "Create a modern parenting blog with SEO, contact forms, newsletter signup, and social media integration" parenting-fm

# Interactive building
./wp-natural
> create project parenting-fm
> add about page
> install yoast seo
> add contact form
> create blog post about sleep training
> find images of happy families
```

### Quick Operations
```bash
# Add functionality
./wp-natural add a contact form to my website
./wp-natural enable caching for better performance
./wp-natural install security plugin

# Create content
./wp-natural write about healthy eating habits for kids
./wp-natural create FAQ page with common questions
./wp-natural add testimonials page

# Manage site
./wp-natural start the website
./wp-natural save my changes
./wp-natural deploy to production
```

## Tips

1. **Be conversational** - The system understands natural language
2. **Mention features** - Just say what you want: "with SEO and contact forms"
3. **Use context** - After selecting a project, all commands apply to it
4. **Batch operations** - Describe everything you want in one sentence
5. **Check status** - Type "status" to see current context

## Troubleshooting

### "Please select a project first"
Solution: Use command like "switch to project [name]" or "use [name]"

### "Tool not available in current phase"
Solution: Check mcp-phases.json and switch to appropriate phase

### Command not understood
Solution: Try rephrasing or use "help" to see examples

## Start Building

Ready to create your WordPress site with natural language?

```bash
# Start interactive mode
./wp-natural

# Or describe your entire site
node ai-assistant.js "Build me a [description of your website]" [project-name]
```

Type naturally, and watch your WordPress site come to life!