# @scrapix/core

Core crawling and content extraction library for Scrapix.

## 🚀 Features

- **Multiple Crawler Engines**: Cheerio (fast), Puppeteer (JS-enabled), Playwright (cross-browser)
- **Extensible Feature Pipeline**: Process content through configurable features
- **Smart Batching**: Efficient document batching for Meilisearch
- **Proxy Support**: Built-in proxy rotation and tiered proxy system
- **Webhook Integration**: Real-time progress monitoring
- **TypeScript**: Full type safety and modern JavaScript features
- **Dependency Injection**: IoC container for better testability
- **Connection Pooling**: Optimized HTTP client with persistent connections
- **Comprehensive Error Handling**: Custom error types with detailed context
- **Retry Logic**: Exponential backoff for failed operations

## 📦 Installation

```bash
npm install @scrapix/core
# or
yarn add @scrapix/core
```

## 🔧 Usage

```typescript
import { Crawler, Sender, Config } from '@scrapix/core';

const config: Config = {
  crawler_type: 'cheerio',
  start_urls: ['https://example.com'],
  meilisearch_url: 'http://localhost:7700',
  meilisearch_api_key: 'masterKey',
  meilisearch_index_uid: 'my_index',
  features: {
    block_split: { activated: true },
    metadata: { activated: true }
  }
};

// Initialize sender
const sender = new Sender(config);
await sender.init();

// Create and run crawler
const crawler = Crawler.create(config.crawler_type, sender, config);
await Crawler.run(crawler);
await sender.finish();
```

## 🏗️ Architecture

### Crawlers

- **BaseCrawler**: Abstract base class with shared crawling logic
- **CheerioCrawler**: Fast static HTML parsing using Cheerio
- **PuppeteerCrawler**: Chrome automation for JavaScript-heavy sites
- **PlaywrightCrawler**: Cross-browser automation with modern APIs

### Features

Features process documents in a pipeline. Each feature can be enabled/disabled and configured:

- **block_split**: Splits pages into semantic blocks for better search
- **metadata**: Extracts page metadata (title, description, etc.)
- **ai_extraction**: Uses OpenAI to extract structured data
- **ai_summary**: Generates AI-powered summaries
- **markdown**: Converts HTML to Markdown
- **schema**: Extracts Schema.org structured data
- **custom_selectors**: Extract data using CSS selectors

### Document Flow

1. Crawler fetches and processes URLs
2. Scraper runs feature pipeline on each page
3. Sender batches documents
4. Documents sent to Meilisearch

## 🛠️ Development

```bash
# Install dependencies
yarn install

# Build
yarn build

# Run in development
yarn dev

# Lint
yarn lint
yarn lint:fix

# Test
yarn test
```

## 📝 Configuration

See the [Config type definition](./src/types.ts) for all available options.

### Example with AI Features

```typescript
const config: Config = {
  crawler_type: 'puppeteer',
  start_urls: ['https://shop.example.com'],
  meilisearch_url: 'http://localhost:7700',
  meilisearch_api_key: 'masterKey',
  meilisearch_index_uid: 'products',
  features: {
    ai_extraction: {
      activated: true,
      prompt: 'Extract product name, price, and availability'
    },
    ai_summary: {
      activated: true
    }
  }
};
```

### Proxy Configuration

```typescript
const config: Config = {
  // ... other config
  proxy_configuration: {
    proxyUrls: [
      'http://proxy1.example.com:8080',
      'http://proxy2.example.com:8080'
    ]
  }
};
```

### Dependency Injection

Use the IoC container for better testability:

```typescript
import { Container, SERVICES, Crawler } from '@scrapix/core';

// Create container with default services
const container = Container.createDefault(config);

// Use container for crawler creation
const crawler = Crawler.createWithContainer(
  config.crawler_type,
  config,
  container
);

// For testing, mock dependencies
const mockClient = { /* mocked Meilisearch client */ };
container.registerValue(SERVICES.MEILISEARCH_CLIENT, mockClient);
```

## 📄 License

MIT