# Crawlers

This directory contains the crawler implementations that power Scrapix's web scraping capabilities.

## 🏗️ Architecture

The crawler system follows a strategy pattern with a factory for crawler creation:

```
crawlers/
├── index.ts         # Crawler factory and orchestration
├── base.ts          # Abstract base crawler with shared logic
├── cheerio.ts       # Fast HTML parser crawler
├── puppeteer.ts     # Chrome automation crawler
└── playwright.ts    # Cross-browser automation crawler
```

## 📁 File Overview

### `index.ts` - Crawler Factory
- **Crawler.create()**: Factory method for creating crawler instances
- **Crawler.run()**: Orchestrates the crawling process
- Manages request queues, webhooks, and sitemap extraction

### `base.ts` - BaseCrawler Abstract Class
- Shared crawling logic for all implementations
- URL filtering and validation
- Error handling and retry logic
- Integration with Scraper for content processing
- Proxy configuration support

### `cheerio.ts` - CheerioCrawler
- Fastest crawler for static HTML content
- Uses Cheerio for jQuery-like server-side DOM manipulation
- Ideal for documentation sites, blogs, and static websites
- Lowest resource usage

### `puppeteer.ts` - PuppeteerCrawler
- Chrome/Chromium automation for JavaScript-heavy sites
- Handles dynamic content and SPAs
- Screenshot capabilities
- Cookie and session management

### `playwright.ts` - PlaywrightCrawler
- Cross-browser support (Chrome, Firefox, Safari)
- Modern automation APIs
- Better handling of modern web applications
- Advanced interaction capabilities

## 🔧 Usage

### Creating a Crawler

```typescript
import { Crawler, Sender } from '@scrapix/core';

const sender = new Sender(config);
const crawler = Crawler.create('cheerio', sender, config);
```

### Running a Crawl

```typescript
await Crawler.run(crawler);
```

## 🎯 Choosing the Right Crawler

| Crawler | Best For | Speed | Resource Usage |
|---------|----------|-------|----------------|
| **Cheerio** | Static HTML, Documentation, Blogs | ⚡⚡⚡ | Low |
| **Puppeteer** | SPAs, Dynamic Content, Screenshots | ⚡ | High |
| **Playwright** | Cross-browser Testing, Modern Apps | ⚡ | High |

## ⚙️ Configuration

Each crawler supports common configuration options:

```typescript
interface CrawlerConfig {
  max_concurrency: number;        // Parallel requests
  max_requests_per_minute: number; // Rate limiting
  request_timeout: number;         // Request timeout in ms
  proxy_configuration?: {          // Proxy settings
    proxyUrls: string[];
  };
  launch_options?: {              // Browser options (Puppeteer/Playwright)
    headless: boolean;
    args: string[];
  };
}
```

## 🔄 Request Flow

1. **URL Queue**: URLs are added to a request queue
2. **Filtering**: URLs are filtered based on configuration
3. **Fetching**: Crawler fetches the page content
4. **Processing**: Content is passed to Scraper for feature extraction
5. **Batching**: Processed documents are sent to Sender

## 🚀 Extending Crawlers

To add a new crawler:

1. Create a new file (e.g., `selenium.ts`)
2. Extend `BaseCrawler` abstract class
3. Implement required methods:
   - `createCrawlerInstance()`
   - `getCrawlerOptions()`
4. Add to factory in `index.ts`

Example:

```typescript
export class SeleniumCrawler extends BaseCrawler {
  createCrawlerInstance(options: any): any {
    // Implementation
  }

  getCrawlerOptions(requestQueue: RequestQueue, router: any): any {
    // Return crawler-specific options
  }
}
```

## 🐛 Common Issues

1. **Memory Leaks**: Browser crawlers may leak memory - ensure proper cleanup
2. **Rate Limiting**: Respect website rate limits to avoid blocking
3. **Proxy Rotation**: Use proxy configuration for distributed crawling
4. **Error Handling**: Implement proper retry logic for transient failures

## 📊 Performance Tips

- Use Cheerio for maximum speed on static content
- Limit concurrency to avoid overwhelming target servers
- Enable request caching for development
- Use proxies for large-scale crawling
- Monitor memory usage with browser-based crawlers