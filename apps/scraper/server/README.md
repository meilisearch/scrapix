# @scrapix/server

REST API server for Scrapix with asynchronous job processing.

## 🚀 Features

- **Asynchronous Job Queue**: Redis-backed Bull queue for scalable crawling
- **REST API**: Simple HTTP endpoints for crawl management
- **Real-time Updates**: Server-Sent Events for job progress monitoring
- **Worker Architecture**: Separate worker process for crawling operations
- **Health Monitoring**: Built-in health check endpoint
- **Input Validation**: Zod schema validation for all API endpoints
- **Rate Limiting**: Configurable rate limits per endpoint
- **Error Handling**: Comprehensive error responses with context
- **Graceful Shutdown**: Proper cleanup of connections and jobs

## 🔧 Requirements

- Node.js 18+
- Redis server (local or cloud)
- @scrapix/core package

## 🏃 Quick Start

```bash
# Install dependencies
yarn install

# Set environment variables
export REDIS_URL=redis://localhost:6379
export PORT=8080

# Development mode
yarn dev

# Production mode
yarn build && yarn start
```

## 📡 API Endpoints

### Health Check
```bash
GET /health
```

### Start Asynchronous Crawl
```bash
POST /crawl
Content-Type: application/json

{
  "start_urls": ["https://example.com"],
  "meilisearch_url": "http://localhost:7700",
  "meilisearch_api_key": "masterKey",
  "meilisearch_index_uid": "my_index"
}
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

### Start Synchronous Crawl
```bash
POST /crawl/sync
Content-Type: application/json
```
Waits for the crawl to complete before returning.

### Check Job Status
```bash
GET /job/:id/status
```

Response:
```json
{
  "jobId": "123",
  "status": "active",
  "progress": 45,
  "createdAt": 1234567890,
  "data": { ... }
}
```

### Stream Job Events (SSE)
```bash
GET /job/:id/events
```

Streams real-time updates:
```
data: {"type":"progress","progress":45}
data: {"type":"completed","result":{...}}
```

## 🏗️ Architecture

The server uses a queue-based architecture:

1. **API Server** (`index.ts`): Handles HTTP requests and adds jobs to queue
2. **Task Queue** (`taskQueue.ts`): Manages Bull queue and job lifecycle
3. **Worker Process** (`crawler_process.ts`): Executes crawl jobs

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  API Server │────▶│    Redis    │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │   Worker    │
                                        └─────────────┘
```

## ⚙️ Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8080` |
| `REDIS_URL` | Redis connection URL | - |
| `WEBHOOK_URL` | Webhook endpoint for notifications | - |
| `WEBHOOK_TOKEN` | Authentication token for webhooks | - |
| `OPENAI_API_KEY` | OpenAI API key for AI features | - |
| `SCRAPIX_MAX_BODY_SIZE` | Maximum request body size | `10mb` |
| `SCRAPIX_RATE_LIMIT_WINDOW` | Rate limit time window (ms) | `900000` |
| `SCRAPIX_RATE_LIMIT_CRAWL` | Max crawl requests per window | `100` |
| `SCRAPIX_RATE_LIMIT_STATUS` | Max status requests per window | `60` |
| `SCRAPIX_RATE_LIMIT_GLOBAL` | Max global requests per window | `1000` |

## 🚀 Deployment

### Docker

```bash
docker build -t scrapix-server .
docker run -p 8080:8080 -e REDIS_URL=redis://host:6379 scrapix-server
```

### Fly.io

```bash
fly deploy --config fly.toml
```

## 🛠️ Development

```bash
# Run with auto-reload
yarn dev

# Build TypeScript
yarn build

# Start production server
yarn start
```

## 📄 License

MIT