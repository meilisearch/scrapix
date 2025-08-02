# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Scrapix is an enterprise-grade web crawling and content extraction platform built as a TypeScript monorepo. It provides intelligent web scraping with AI-powered extraction, designed for integration with Meilisearch search engine.

## Development Commands

### Essential Commands
```bash
# Development
yarn dev              # Run all apps in development mode with hot-reload
yarn dev:build        # Build in watch mode

# Building & Running
yarn build            # Build all packages
yarn scrape          # Run the CLI scraper (works from anywhere)
yarn server          # Run the API server
yarn server:dev      # Run server in development mode

# Code Quality
yarn lint            # Run ESLint across all packages
yarn lint:fix        # Auto-fix linting errors
yarn test            # Run Jest tests

# Specific Apps
cd apps/scraper/core && yarn dev    # Work on core library
cd apps/scraper/server && yarn dev  # Work on API server with hot-reload
cd apps/proxy && yarn dev           # Work on proxy server
```

### Local Development Environment
```bash
# Start development services (Meilisearch, Redis, apps)
docker-compose up

# Services available:
# - Meilisearch: http://localhost:7700 (master key: masterKey)
# - Redis: localhost:6379
# - Scraper API: http://localhost:8080
# - Playground: http://localhost:3000
```

### Testing Crawlers
```bash
# Quick scraper usage (works from anywhere in the project)
yarn scrape -p misc/tests/meilisearch/simple.json

# With inline config
yarn scrape -c '{"start_urls":["https://example.com"],"meilisearch_url":"http://localhost:7700","meilisearch_api_key":"masterKey","meilisearch_index_uid":"my_index"}'

# With custom browser
yarn scrape -p misc/config_examples/default-simple.json -b "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

### Running the API Server
```bash
# Start server on default port 8080
yarn server

# Custom port
yarn server -p 3000

# With Redis for job queue
yarn server -r redis://localhost:6379

# With custom environment file
yarn server -e .env.production

# Development mode with hot-reload
yarn server:dev
```

## Architecture

### Repository Structure
```
apps/
├── scraper/
│   ├── core/      # Core crawling library (Crawlee-based)
│   ├── server/    # REST API with Bull queue
│   └── cli/       # Command-line interface
├── proxy/         # Proxy server for enterprise proxies
├── playground/    # Next.js test application
└── docs/          # Mintlify documentation site
```

### Core Components

**Crawler System** (`apps/scraper/core/src/`):
- `Crawler` - Factory for creating crawler instances
- `BaseCrawler` - Abstract base implementing crawling logic
- `CheerioCrawler` - Fast static HTML parsing
- `PuppeteerCrawler` - Chrome automation for JS sites
- `PlaywrightCrawler` - Cross-browser automation

**Feature Pipeline** (`apps/scraper/core/src/scrapers/features/`):
- Features process documents sequentially
- Each feature can be enabled/disabled via config
- Features: `block_split`, `metadata`, `ai_extraction`, `ai_summary`, `markdown`, `schema`, `custom_selectors`

**Document Flow**:
1. Crawler fetches and processes URLs
2. Scraper runs feature pipeline on each page
3. Sender batches and sends documents to Meilisearch

**Server API** (`apps/scraper/server/src/`):
- Express server with Redis-backed Bull queue
- Endpoints: `/crawl`, `/crawl/sync`, `/job/:id/status`, `/job/:id/events`
- Separate worker process for job execution

### Key Patterns
- Factory pattern for crawler creation
- Strategy pattern for crawler implementations  
- Pipeline pattern for feature processing
- Builder pattern for document construction

## Important Development Notes

### TypeScript Configuration
- Target: ES2022, Module: ESNext
- Strict mode enabled
- Path aliases configured per workspace

### Testing
- Jest configured but test files should be added
- Test examples in `misc/tests/`
- Use playground app for manual testing

### Environment Variables
```bash
# Required for AI features
OPENAI_API_KEY=sk-...

# Production deployment
REDIS_URL=redis://...           # Upstash Redis
WEBHOOK_URL=https://...         # Monitoring webhooks
WEBHOOK_TOKEN=...               # Webhook auth
```

### Common Tasks

**Adding a New Feature**:
1. Create feature class in `apps/scraper/core/src/scrapers/features/`
2. Extend from base feature class
3. Register in feature processing pipeline
4. Add configuration schema

**Modifying Crawler Behavior**:
1. Check `BaseCrawler` for shared logic
2. Override methods in specific crawler classes
3. Update factory in `Crawler.create()`

**API Changes**:
1. Update route in `apps/scraper/server/src/routes/`
2. Modify job processor if needed
3. Update OpenAPI schema if exists

### Deployment
- Main app deploys to `scrapix.fly.dev`
- Uses Fly.io with Upstash Redis
- Health checks on `/health` endpoint
- See `deploy-commands.md` for deployment scripts

### Performance Considerations
- Default concurrency: 10 requests
- Batch size: 1000 documents  
- Rate limiting configurable per crawler
- Proxy rotation for distributed crawling

### Publishing Package
```bash
# In apps/scraper/core
npm version patch/minor/major
yarn build
npm publish
```