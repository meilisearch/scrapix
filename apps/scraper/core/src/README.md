# Core Source Code

This directory contains the source code for the Scrapix core library, implementing the complete web crawling and content extraction pipeline.

## 🏗️ Architecture Overview

```
src/
├── crawlers/        # Web crawling engines
├── scrapers/        # Content extraction and processing
├── utils/           # Utility functions and helpers
├── index.ts         # Main library exports
├── sender.ts        # Meilisearch document batching
├── types.ts         # TypeScript type definitions
└── webhook.ts       # Webhook notification system
```

## 📋 Core Components

### 📄 `index.ts` - Library Entry Point
Exports all public APIs for the @scrapix/core package:

```typescript
export { Crawler } from './crawlers';
export { Scraper, createScraper } from './scrapers';
export { Sender } from './sender';
export { Config, ConfigSchema, Document } from './types';
export { Webhook } from './webhook';
```

### 📤 `sender.ts` - Document Sender
Manages efficient batching and sending of documents to Meilisearch:

**Key Features:**
- Automatic batching (default: 1000 documents)
- Index management with atomic swaps
- Progress tracking
- Error recovery
- Settings application

**Usage:**
```typescript
const sender = new Sender(config);
await sender.init();        // Initialize index
await sender.add(document); // Add document to batch
await sender.finish();      // Flush remaining and swap index
```

### 🔍 `types.ts` - Type Definitions
Central type definitions for the entire library:

**Key Types:**
- `Config` - Main configuration interface
- `Document` - Base document structure
- `BlockDocument` - Split document structure
- `CrawlerType` - Available crawler types
- `Features` - Feature configuration
- `ProxyConfiguration` - Proxy settings

**Config Schema:**
Uses Zod for runtime validation:
```typescript
const config = ConfigSchema.parse(userConfig);
```

### 📡 `webhook.ts` - Webhook System
Sends real-time crawling updates to configured endpoints:

**Webhook Events:**
- `added` - Job added to queue
- `active` - Crawling in progress
- `completed` - Crawling finished
- `failed` - Error occurred

**Payload Structure:**
```json
{
  "date": "2024-01-01T12:00:00.000Z",
  "meilisearch_url": "http://localhost:7700",
  "meilisearch_index_uid": "my_index",
  "status": "active",
  "nb_page_crawled": 42,
  "nb_page_indexed": 40,
  "nb_documents_sent": 150
}
```

## 🔄 Data Flow

```
1. Crawler (crawlers/)
   ↓ Fetches URLs
2. Scraper (scrapers/)
   ↓ Extracts content
3. Features (scrapers/features/)
   ↓ Process document
4. Sender (sender.ts)
   ↓ Batch documents
5. Meilisearch
   ↓ Index documents
6. Webhook (webhook.ts)
   → Status updates
```

## 🎯 Key Design Patterns

### Factory Pattern
Used for crawler creation:
```typescript
const crawler = Crawler.create('cheerio', sender, config);
```

### Strategy Pattern
Different crawler implementations:
- CheerioCrawler
- PuppeteerCrawler
- PlaywrightCrawler

### Pipeline Pattern
Feature processing pipeline:
```typescript
document = await processMetadata($, document, config);
document = await processMarkdown($, document, config);
// ... more features
```

### Builder Pattern
Document construction through features:
```typescript
return {
  ...document,
  metadata: extractedMetadata,
  markdown: convertedContent
};
```

## 🔧 Extension Points

### Adding a New Crawler
1. Create class in `crawlers/`
2. Extend `BaseCrawler`
3. Add to factory in `crawlers/index.ts`

### Adding a New Feature
1. Create processor in `scrapers/features/`
2. Add to pipeline in `scrapers/index.ts`
3. Update types in `types.ts`

### Adding a Utility
1. Create module in `utils/`
2. Export from `utils/index.ts` if needed
3. Document usage

## 📊 Performance Considerations

### Memory Management
- Crawlers process URLs in batches
- Documents are sent in configurable batches
- Browser crawlers require memory monitoring

### Concurrency
- Default: 10 concurrent requests
- Configurable via `max_concurrency`
- Rate limiting via `max_requests_per_minute`

### Error Recovery
- Automatic retries for transient failures
- Graceful degradation for feature failures
- Webhook notifications for monitoring

## 🐛 Common Issues

1. **Memory Leaks**
   - Monitor browser crawler memory usage
   - Ensure proper cleanup in features
   - Check batch sizes

2. **Rate Limiting**
   - Adjust `max_requests_per_minute`
   - Use proxy rotation
   - Implement backoff strategies

3. **Large Documents**
   - Consider increasing batch size
   - Monitor Meilisearch payload limits
   - Use block splitting for large pages

## 🧪 Testing

Run tests from the core directory:

```bash
# Unit tests
yarn test

# Integration tests
yarn test:integration

# Watch mode
yarn test:watch
```

## 📝 Development Guidelines

1. **Type Safety**: Always provide TypeScript types
2. **Error Handling**: Use try-catch with logging
3. **Documentation**: Include JSDoc comments
4. **Imports**: Use relative imports within src/
5. **Logging**: Use Crawlee's Log system

## 🔗 Dependencies

Core dependencies:
- **crawlee**: Web crawling framework
- **cheerio**: HTML parsing
- **meilisearch**: Search engine client
- **puppeteer**: Chrome automation
- **playwright**: Cross-browser automation
- **zod**: Schema validation

See `package.json` for complete list.