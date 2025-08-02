# Scrapix

🚀 **Advanced Web Crawler & AI-Powered Content Extraction Platform**

Scrapix is an enterprise-grade web crawling and content extraction platform optimized for information retrieval. It combines multiple crawler engines, AI-powered content processing, intelligent batching, and robust proxy support to deliver high-quality, structured data to Meilisearch.

## ✨ Key Features

- **🤖 AI-Powered Extraction**: OpenAI GPT integration for intelligent content extraction and summarization
- **🔧 Multiple Crawler Engines**: Cheerio (fast), Puppeteer (JS-enabled), Playwright (cross-browser)
- **🌐 Enterprise Proxy Support**: Built-in proxy rotation and dedicated proxy server with authentication
- **📊 Advanced Content Processing**: Schema.org, PDF extraction, custom selectors, markdown conversion
- **🎯 Smart Content Splitting**: Hierarchical block splitting for optimal search relevance
- **📡 Real-time Monitoring**: Webhooks, progress tracking, and health monitoring
- **⚡ High Performance**: Concurrent crawling, intelligent batching, connection pooling, and distributed architecture
- **🗺️ Sitemap Integration**: Automatic sitemap discovery and parsing
- **🔒 Security**: Input validation, rate limiting, and authentication support
- **🏗️ Modern Architecture**: Dependency injection, comprehensive error handling, and TypeScript throughout

## 🎯 Quick Start

### Development Setup

```bash
# Install dependencies
yarn install

# Build all packages
yarn build

# Run in development mode
yarn dev
```

### CLI Usage

```bash
# Quick scraper usage (works from anywhere in the project)
yarn scrape -p misc/tests/meilisearch/simple.json

# With inline JSON config
yarn scrape -c '{"start_urls":["https://example.com"],"meilisearch_url":"http://localhost:7700","meilisearch_api_key":"masterKey","meilisearch_index_uid":"test"}'

# Use custom browser for Playwright/Puppeteer
yarn scrape -p config.json -b /path/to/chrome
```

### Server Usage

```bash
# Start the API server (default port 8080)
yarn server

# Custom port
yarn server -p 3000

# With Redis for job queue
yarn server -r redis://localhost:6379

# With custom .env file
yarn server -e .env.production

# Development mode with hot-reload
yarn server:dev

# Get help
yarn server --help
```

### API Usage

```bash
# Start the API server (requires Redis)
cd apps/scraper/server && yarn dev

# Or use Docker Compose for the full stack
docker-compose up
```

The API server provides endpoints for asynchronous and synchronous crawling:
- `POST /crawl` - Start an asynchronous crawl job
- `POST /crawl/sync` - Start a synchronous crawl (waits for completion)
- `GET /job/:id/status` - Check job status
- `GET /job/:id/events` - Stream job events (SSE)

## 🔧 Crawler Engines

Scrapix supports multiple crawler engines optimized for different use cases:

### Cheerio (Default)
- **Best for**: Static websites, fast crawling
- **Performance**: Lowest resource usage, highest speed
- **Limitations**: No JavaScript execution
- **Use case**: Documentation sites, blogs, static content

### Puppeteer 
- **Best for**: JavaScript-heavy sites, SPAs
- **Performance**: Higher resource usage, full Chrome browser
- **Capabilities**: JavaScript execution, dynamic content rendering
- **Use case**: React/Vue/Angular apps, complex web applications

### Playwright
- **Best for**: Cross-browser testing, modern web apps
- **Performance**: Similar to Puppeteer with modern APIs
- **Capabilities**: Chrome, Firefox, Safari support
- **Use case**: Cross-browser compatibility requirements

```json
{
  "crawler_type": "cheerio", // "cheerio" | "puppeteer" | "playwright"
  "launch_options": {
    "headless": true,
    "args": ["--no-sandbox"]
  }
}
```

## 🤖 AI-Powered Features

### AI Extraction
Extract structured data using OpenAI GPT models:

```json
{
  "features": {
    "ai_extraction": {
      "activated": true,
      "include_pages": ["*"],
      "prompt": "Extract product information including name, price, description, and availability"
    }
  }
}
```

### AI Summary
Generate concise summaries optimized for search:

```json
{
  "features": {
    "ai_summary": {
      "activated": true,
      "include_pages": ["*/blog/*", "*/docs/*"]
    }
  }
}
```

**Environment Variables:**
```bash
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o-mini  # Default model
```

## 🌐 Proxy Support

### Simple Proxy Rotation
```json
{
  "proxy_configuration": {
    "proxyUrls": [
      "http://proxy1.example.com:8080",
      "http://proxy2.example.com:8080"
    ]
  }
}
```

### Tiered Proxy System
```json
{
  "proxy_configuration": {
    "tieredProxyUrls": [
      ["http://premium-proxy.com:8080"],
      ["http://backup1.com:8080", "http://backup2.com:8080"]
    ]
  }
}
```

## 📋 Advanced Content Processing

### Schema.org Extraction
```json
{
  "features": {
    "schema": {
      "activated": true,
      "only_type": "Product",  // Extract only Product schemas
      "convert_dates": true    // Convert dates to timestamps
    }
  }
}
```

### PDF Processing
```json
{
  "features": {
    "pdf": {
      "activated": true,
      "extract_content": true,
      "extract_metadata": true
    }
  }
}
```

### Custom Data Extraction
```json
{
  "features": {
    "custom_selectors": {
      "activated": true,
      "selectors": {
        "product_name": "h1.product-title",
        "price": ".price-current",
        "reviews": ".review-item"
      }
    }
  }
}
```

### Markdown Conversion
```json
{
  "features": {
    "markdown": {
      "activated": true,
      "include_pages": ["*/docs/*"]
    }
  }
}
```

## 🗺️ URL Discovery & Control

### Sitemap Integration
```json
{
  "use_sitemap": true,
  "sitemap_urls": [
    "https://example.com/sitemap.xml",
    "https://example.com/blog-sitemap.xml"
  ]
}
```

### Advanced URL Filtering
```json
{
  "urls_to_exclude": ["*/admin/*", "**/private/**"],
  "urls_to_index": ["*/products/*", "*/blog/*"],
  "urls_to_not_index": ["*/search*", "*/filter*"]
}
```

## ⚡ Performance & Scalability

### Concurrency Control
```json
{
  "max_concurrency": 10,
  "max_requests_per_minute": 60,
  "batch_size": 1000
}
```

### Error Detection
```json
{
  "not_found_selectors": [
    ".error-404",
    "#not-found-message"
  ]
}
```

## 📡 Real-time Monitoring

### Webhooks
```json
{
  "webhook_url": "https://your-app.com/webhook",
  "webhook_payload": {
    "project_id": "my-project",
    "environment": "production"
  }
}
```

**Environment Variables:**
```bash
WEBHOOK_URL=https://your-app.com/webhook
WEBHOOK_TOKEN=your_webhook_token
WEBHOOK_INTERVAL=5000  # Milliseconds
```

## 🔌 API Reference

### POST /crawl (Asynchronous)

Start an asynchronous crawling job that returns immediately with a job ID:

```bash
curl -X POST http://localhost:8080/crawl \
  -H "Content-Type: application/json" \
  -d @config.json
```

Response:
```json
{
  "status": "ok",
  "jobId": "123",
  "indexUid": "my_index",
  "statusUrl": "/job/123/status",
  "eventsUrl": "/job/123/events"
}
```

### POST /crawl/sync (Synchronous)

Start a synchronous crawling job that waits for completion:

```bash
curl -X POST http://localhost:8080/crawl/sync \
  -H "Content-Type: application/json" \
  -d @config.json
```

### Configuration Schema

```json
{
  // Core Configuration
  "crawler": "cheerio",
  "start_urls": ["https://example.com"],
  "meilisearch_url": "http://localhost:7700",
  "meilisearch_api_key": "masterKey",
  "meilisearch_index_uid": "my_index",
  
  // URL Control
  "urls_to_exclude": ["*/admin/*", "*/private/*"],
  "urls_to_index": ["*/products/*", "*/blog/*"],
  "urls_to_not_index": ["*/search*"],
  "use_sitemap": true,
  "sitemap_urls": ["https://example.com/sitemap.xml"],
  
  // Performance
  "max_concurrency": 10,
  "max_requests_per_minute": 60,
  "batch_size": 1000,
  
  // Proxy Configuration
  "proxy_configuration": {
    "proxyUrls": ["http://proxy.example.com:8080"]
  },
  
  // Features
  "features": {
    "block_split": {
      "activated": true,
      "include_pages": ["*"],
      "exclude_pages": []
    },
    "metadata": {
      "activated": true,
      "include_pages": ["*"],
      "exclude_pages": []
    },
    "ai_extraction": {
      "activated": false,
      "include_pages": ["*/products/*"],
      "prompt": "Extract product name, price, description, and availability"
    },
    "ai_summary": {
      "activated": false,
      "include_pages": ["*/blog/*", "*/docs/*"]
    },
    "custom_selectors": {
      "activated": false,
      "selectors": {
        "product_name": "h1.product-title",
        "price": ".price",
        "description": ".product-description"
      }
    },
    "markdown": {
      "activated": false,
      "include_pages": ["*/docs/*"]
    },
    "pdf": {
      "activated": false,
      "extract_content": true,
      "extract_metadata": true
    },
    "schema": {
      "activated": false,
      "convert_dates": true,
      "only_type": "Product"
    }
  },
  
  // Meilisearch Settings
  "primary_key": null,
  "meilisearch_settings": {
    "searchableAttributes": ["h1", "h2", "h3", "h4", "h5", "h6", "p", "title", "meta.description"],
    "filterableAttributes": ["urls_tags", "type"],
    "distinctAttribute": "url"
  },
  
  // Monitoring
  "webhook_url": "https://your-app.com/webhook",
  "webhook_payload": {
    "project_id": "my-project"
  },
  
  // Authentication & Headers
  "additional_request_headers": {
    "Authorization": "Bearer your-token"
  },
  "user_agents": ["MyBot/1.0"]
}
```

## Process

### 1. Add it to the queue

While the server receives a crawling request it will add it to the queue. When the data is added to the queue, it will return a response to the user.
The queue is handled by redis ([Bull](https://github.com/OptimalBits/bull)).
The queue will dispatch the job to the worker.

### 2. Scrape the website

#### 2.1. Default features

The worker will crawl only pages with the same domain names as those specified in the `start_urls` config option. It will not try to scrape the external links or files. It will also not try to scrape paginated pages (like `/page/1`).
For each scrappable page it will scrape the data by trying to create blocks of titles and text. Each block will contain:

- h1: The title of the block
- h2: The sub title of the block
- h3...h6: The sub sub title of the block
- p: The text of the block (will create an array of text if there is multiple p in the block)
- page_block: The block number of the page (staring at 0)
- title: The title of the page present in the head tag
- uid: a generated and incremental uid for the block
- url: The url of the page
- anchor: The anchor of the block (the lower title id of the block)
- meta: The meta of the page present in the head tag (json object containing the desciption, keywords, author, twitter, og, etc...)
- url_tags: the url pathname split by / (array of string). The last element has been removed because it's the page name.

#### 2.2. Docsearch feature

The worker will crawl only pages with the same domain names as those specified in the `start_urls` config option. It will not try to scrape the external links or files. It will also not try to scrape when pages are paginated pages (like `/page/1`).
For each scrappable page it will scrape the data by trying to create blocks of titles and text. Each block will contain:

- uid: a generated and incremental uid for the block
- hierarchy_lvl0: the url pathname split by / (array of string). The last element has been removed because it's the page name.
- hierarchy_lvl1: the h1 of the block
- hierarchy_lvl2: the h2 of the block
- hierarchy_lvl3: the h3 of the block
- hierarchy_lvl4: the h4 of the block
- hierarchy_lvl5: the h5 of the block
- hierarchy_radio_lvl0: same as hierarchy_lvl0
- hierarchy_radio_lvl1: same as hierarchy_lvl1
- hierarchy_radio_lvl2: same as hierarchy_lvl2
- hierarchy_radio_lvl3: same as hierarchy_lvl3
- hierarchy_radio_lvl4: same as hierarchy_lvl4
- hierarchy_radio_lvl5: same as hierarchy_lvl5
- content: The text of the block (will create an array of text if there is multiple p in the block)
- url: The url of the page with the anchor
- anchor: The anchor of the block (the lower title id of the block)

### 3. Send the data to Meilisearch

While the worker is scraping the website it will send the data to Meilisearch by batch.
Before sending the data to Meilisearch, it will create a new index called `{index_uid}_crawler_tmp`, apply the settings and add the data to it. Then it will use the index swap method to replace the old index by the new one. It will finish properly by deleting the tmp index.

The setting applied:

```json
{
  "searchableAttributes": [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "title",
    "meta.description"
  ],
  "filterableAttributes": ["urls_tags"],
  "distinctAttribute": "url"
}
```

## Configuration file

`start_urls` _mandatory_

This array contains the list of URLs that will be used to start scraping your website.
The scraper will recursively follow any links (<a> tags) from those pages. It will not follow links that are on another domain.

`urls_to_exclude`
List of the URL's to ignore

`urls_to_not_index`
List of the URLS that should not be indexed

`meilisearch_url` _mandatory_
The URL to your Meilisearch instance

`meilisearch_api_key`
The API key to your Meilisearch instance. This key must have read and write permissions for the specified index.

`meilisearch_index_uid` _mandatory_
Name of the index on which the content is indexed.

`features`
Configuration for various content extraction and processing features. Each feature can be enabled/disabled and configured with specific settings:

- `block_split`: Splits the page into logical content blocks
- `metadata`: Extracts meta information from the page
- `custom_selectors`: Allows defining custom CSS selectors for content extraction
- `markdown`: Converts HTML content to Markdown format
- `pdf`: Extracts content and metadata from PDF files
- `schema`: Extracts structured data from Schema.org markup

Each feature can be configured with:
- `activated`: Whether the feature is enabled
- `include_pages`: List of page patterns to include
- `exclude_pages`: List of page patterns to exclude
- Feature-specific settings (e.g., `extract_content` for PDF, `selectors` for custom_selectors)

`primary_key`
The key name in your documents containing their unique identifier.

`meilisearch_settings`
Your custom Meilisearch settings

`user_agents`
An array of user agents that are append at the end of the current user agents.
In this case, if your `user_agents` value is `['My Thing (vx.x.x)']` the final `user_agent` becomes

```
Meilisearch JS (vx.x.x); Meilisearch Crawler (vx.x.x); My Thing (vx.x.x)
```

`webhook_payload`
In the case that [webhooks](#webhooks) are enabled, the webhook_payload option gives the possibility to provide information that will be added in the webhook payload.

`webhook_url`
The URL on which the webhook calls are made.

`additional_request_headers`
An object containing headers to be added to every request the crawler makes.
This can be useful to add authentication headers to crawl protected sites.

E.g. authenticate crawler with basic auth:
```
{
  "additional_request_headers": {
    "Authorization": "Basic dXNlcjpwYXNzd29yZA=="
  }
}
```

## Webhooks

To be able to receive updates on the state of the crawler, you need to create a webhook. To do so, you must have a public URL that is reachable by the crawler. This URL will be called by the crawler to send you updates.

To enable webhooks, you need add the following env vars.

```txt
WEBHOOK_URL=https://mywebsite.com/webhook
WEBHOOK_TOKEN=mytoken
WEBHOOK_INTERVAL=1000
```

- The `WEBHOOK_URL` is the URL that will be called by the crawler. The calls will be made with the `POST` method.
- The `WEBHOOK_TOKEN` is a token string that will be used to authenticate the request. It will be used if present in the `Authorization` header of the request in the format `Authorization: Bearer ${token}`.
- The `WEBHOOK_INTERVAL` is a way to change the frequency you want to receive updated from the scraper. The value is in milliseconds. The default value is 5000ms.

Here is the Webhook payload:

```json
{
  "date": "2022-01-01T12:34:56.000Z",
  "meilisearch_url": "https://myproject.meilisearch.com",
  "meilisearch_index_uid": "myindex",
  "status": "active", // "added", "completed", "failed", "active", "wait", "delayed"
  "nb_page_crawled": 20,
  "nb_page_indexed": 15
}
```

It is possible to add additional information in the webhook payload through the `webhook_payload` configuration

## 🌍 Environment Variables

```bash
# AI Features
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
SCRAPIX_AI_MAX_CONTENT_LENGTH=4000
SCRAPIX_AI_EXTRACTION_TEMP=0.1
SCRAPIX_AI_SUMMARY_TEMP=0.3
SCRAPIX_AI_SUMMARY_MAX_TOKENS=150

# Webhooks
WEBHOOK_URL=https://your-app.com/webhook
WEBHOOK_TOKEN=your_webhook_secret
WEBHOOK_INTERVAL=5000

# Server Configuration
PORT=8080
REDIS_URL=redis://localhost:6379
SCRAPIX_MAX_BODY_SIZE=10mb

# Rate Limiting
SCRAPIX_RATE_LIMIT_WINDOW=900000  # 15 minutes
SCRAPIX_RATE_LIMIT_CRAWL=100
SCRAPIX_RATE_LIMIT_STATUS=60
SCRAPIX_RATE_LIMIT_GLOBAL=1000

# Proxy Server
PROXY_PORT=8080
PROXY_AUTH_ENABLED=true
PROXY_AUTH_TYPE=basic  # or "bearer"
PROXY_AUTH_USERS=user1:pass1,user2:pass2
PROXY_AUTH_TOKENS=token1,token2

# HTTP Client Configuration
SCRAPIX_HTTP_KEEP_ALIVE_MS=1000
SCRAPIX_HTTP_MAX_SOCKETS=256
SCRAPIX_HTTP_TIMEOUT=30000

# Retry Configuration
SCRAPIX_RETRY_MAX_ATTEMPTS=3
SCRAPIX_RETRY_BASE_DELAY=1000
SCRAPIX_RETRY_MAX_DELAY=10000

# Regional Deployment
FLY_REGION=ord
```

## 🚀 Deployment

### Deploy to Fly.io (Recommended)
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Deploy with one command
fly launch

# Set secrets
fly secrets set MEILISEARCH_URL="https://your-instance.meilisearch.io" \
  MEILISEARCH_API_KEY="your-key" \
  REDIS_URL="redis://your-redis.upstash.io"

# Deploy updates
fly deploy
```

### Docker Deployment
```bash
# Using Docker Compose (includes Meilisearch + Redis)
docker-compose up -d

# Or use standalone Docker
docker build -t scrapix .
docker run -p 8080:8080 --env-file .env scrapix
```

### Quick Cloud Deploy
```bash
# Deploy to Fly.io with our script
./scripts/deploy-fly.sh production

# Or use GitHub Actions (on push to main)
git push origin main
```

## 🏗️ Architecture

Scrapix features a distributed architecture optimized for scalability:

- **🎯 CLI Tool**: Simple command-line interface for local development
- **🚀 Server Application**: REST API with task queue management  
- **⚡ Worker Processes**: Distributed crawling and processing
- **🌐 Proxy Server**: Dedicated proxy management and rotation
- **📊 Real-time Monitoring**: Webhooks and progress tracking

## 📚 Configuration Examples

Check the `/misc/config_examples/` directory for real-world configuration examples:

- **AI-powered extraction**: `openai-docsearch-strat.json`
- **Documentation sites**: `docusaurus-default.json`
- **E-commerce crawling**: `schema-config.json`
- **PDF processing**: `pdf-crawler.json`
- **Custom selectors**: `schema-config-cheerio.json`

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
