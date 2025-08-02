# Scrapix Scraper

This directory contains the core scraping functionality of Scrapix, organized as a monorepo with three main packages:

## 📦 Packages

### [core](./core)
The heart of Scrapix - contains all crawling engines, content extraction features, and Meilisearch integration.

- Multiple crawler implementations (Cheerio, Puppeteer, Playwright)
- Feature pipeline for content processing
- Document batching and sending to Meilisearch
- Webhook support for real-time monitoring

### [server](./server)
REST API server for managing crawl jobs with Redis-backed queue system.

- Asynchronous job processing with Bull queue
- Real-time job status and event streaming
- Health monitoring endpoints
- Worker process for distributed crawling

### [cli](./cli)
Command-line interface for direct crawling operations.

- Configuration file or inline JSON support
- Custom browser path support
- Direct access to all crawler features

## 🚀 Development

```bash
# Install all dependencies
yarn install

# Build all packages
yarn build

# Run specific package
cd core && yarn dev
cd server && yarn dev
cd cli && yarn dev
```

## 🏗️ Architecture

```
scraper/
├── core/           # Crawling library (@scrapix/core)
├── server/         # API server (@scrapix/server)
├── cli/            # CLI tool (@scrapix/cli)
└── package.json    # Workspace configuration
```

The packages are linked using Yarn workspaces, allowing the server and CLI to use the local core package during development.