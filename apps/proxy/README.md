# Scrapix Network Proxy

A high-performance HTTP/HTTPS proxy server designed for web crawling. Routes crawler traffic through multiple regions for improved performance and IP rotation. Compatible with Crawlee and other web scraping tools.

## Features

- **HTTP/HTTPS Proxy**: Full support for HTTP and HTTPS tunneling
- **Simple & Fast**: No authentication or rate limiting - maximum performance
- **Request Logging**: Detailed logging of all proxy requests
- **Multi-Region Ready**: Optimized for deployment across multiple Fly.io regions
- **Health Monitoring**: Built-in health check and stats endpoints
- **IP Rotation**: Different proxy endpoints provide different exit IPs

## Proxy Configuration

### Basic Usage

Configure your crawler to use the proxy:

```javascript
// Crawlee example
import { CheerioCrawler } from 'crawlee'

const crawler = new CheerioCrawler({
  proxyConfiguration: {
    proxyUrls: [
      'http://scrapix-proxy-iad.fly.dev:8080',
      'http://scrapix-proxy-lax.fly.dev:8080',
      'http://scrapix-proxy-lhr.fly.dev:8080'
    ]
  },
  // ... other options
})
```

### Using cURL

```bash
# HTTP proxy
curl -x http://scrapix-proxy-iad.fly.dev:8080 https://httpbin.org/ip

# Test different regions
curl -x http://scrapix-proxy-lax.fly.dev:8080 https://httpbin.org/ip
curl -x http://scrapix-proxy-lhr.fly.dev:8080 https://httpbin.org/ip
```

## Management Endpoints

### GET /proxy-health

Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "healthy",
  "region": "iad",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "stats": {
    "requestsToday": 1247,
    "totalRequests": 15632,
    "lastReset": "2024-01-15T00:00:00.000Z"
  }
}
```

### GET /proxy-stats

Detailed statistics and recent request logs.

**Response:**
```json
{
  "stats": {
    "requestsToday": 1247,
    "totalRequests": 15632,
    "lastReset": "2024-01-15T00:00:00.000Z"
  },
  "recentLogs": [
    {
      "id": "uuid",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "method": "GET",
      "url": "https://example.com",
      "statusCode": 200,
      "duration": 156,
      "clientIP": "192.168.1.1"
    }
  ]
}
```

### GET /proxy-info

General information about the proxy server.

**Response:**
```json
{
  "name": "@scrapix/proxy",
  "version": "0.1.0",
  "type": "HTTP/HTTPS Proxy",
  "region": "iad",
  "uptime": 3600,
  "usage": {
    "http": "http://scrapix-proxy-iad.fly.dev:8080",
    "https": "http://scrapix-proxy-iad.fly.dev:8080",
    "note": "Configure your crawler to use this server as HTTP/HTTPS proxy"
  }
}
```

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Deployment

### Single Region Deployment

```bash
fly deploy
```

### Multi-Region Deployment

Use the included deployment script to deploy to multiple regions:

```bash
./deploy-regions.sh
```

This will deploy to:
- `iad` - Washington D.C. (US East)
- `lax` - Los Angeles (US West)
- `lhr` - London (Europe)
- `sin` - Singapore (Asia)
- `syd` - Sydney (Australia)

Each region will have its own app: `scrapix-proxy-iad`, `scrapix-proxy-lax`, etc.

### Environment Variables

- `PORT` - Server port (default: 3000)
- `FLY_REGION` - Automatically set by Fly.io
- `NODE_ENV` - Environment (development/production)

## Usage Examples

### Basic Crawling
```bash
curl -X POST https://scrapix-proxy-iad.fly.dev/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

### Advanced Crawling with Custom Selectors
```bash
curl -X POST https://scrapix-proxy-iad.fly.dev/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "options": {
      "crawlerType": "playwright",
      "includeLinks": true,
      "selectors": {
        "content": "main article",
        "metadata": {
          "author": ".author-name",
          "publishDate": ".publish-date"
        }
      }
    }
  }'
```

### JavaScript-Heavy Sites
```bash
curl -X POST https://scrapix-proxy-iad.fly.dev/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://spa-example.com",
    "options": {
      "crawlerType": "playwright"
    }
  }'
```

## Architecture

The proxy service is built with:
- **Express.js** - Web server framework
- **Crawlee** - Web scraping and crawling library
- **TypeScript** - Type safety and better development experience
- **Docker** - Containerization for consistent deployment

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License