# @scrapix/proxy

A secure, high-performance HTTP/HTTPS proxy server designed for enterprise web crawling with authentication and monitoring capabilities.

## 🚀 Features

- **HTTP/HTTPS Proxy**: Full support for HTTP and HTTPS tunneling via CONNECT
- **Authentication**: Configurable Basic and Bearer token authentication
- **Request Logging**: Detailed logging with configurable retention
- **Multi-Region Ready**: Optimized for deployment across multiple regions
- **Health Monitoring**: Built-in health check and stats endpoints
- **IP Rotation**: Deploy to different regions for different exit IPs
- **Security**: Configurable authentication to prevent unauthorized usage

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PROXY_PORT` | Proxy server port | `8080` |
| `PORT` | Management API port | `3000` |
| `PROXY_AUTH_ENABLED` | Enable authentication | `false` |
| `PROXY_AUTH_TYPE` | Auth type: `basic` or `bearer` | `basic` |
| `PROXY_AUTH_USERS` | Basic auth users (comma-separated) | - |
| `PROXY_AUTH_TOKENS` | Bearer tokens (comma-separated) | - |
| `SCRAPIX_PROXY_MAX_LOGS` | Max logs to keep in memory | `1000` |
| `SCRAPIX_PROXY_TIMEOUT` | Request timeout (ms) | `30000` |

### Authentication Setup

#### Basic Authentication
```bash
export PROXY_AUTH_ENABLED=true
export PROXY_AUTH_TYPE=basic
export PROXY_AUTH_USERS="user1:pass1,user2:pass2"
```

#### Bearer Token Authentication
```bash
export PROXY_AUTH_ENABLED=true
export PROXY_AUTH_TYPE=bearer
export PROXY_AUTH_TOKENS="token1,token2,token3"
```

## 📡 Usage

### With Authentication

#### Basic Auth
```bash
# Using curl
curl -x http://user1:pass1@localhost:8080 https://httpbin.org/ip

# In your crawler configuration
{
  "proxy_configuration": {
    "proxyUrls": ["http://user1:pass1@proxy.example.com:8080"]
  }
}
```

#### Bearer Token
```bash
# Using curl with Proxy-Authorization header
curl -x http://localhost:8080 \
  -H "Proxy-Authorization: Bearer token1" \
  https://httpbin.org/ip

# In your code
const proxyAgent = new HttpsProxyAgent({
  host: 'proxy.example.com',
  port: 8080,
  headers: {
    'Proxy-Authorization': 'Bearer token1'
  }
});
```

### Without Authentication (Development)
```bash
curl -x http://localhost:8080 https://httpbin.org/ip
```

## 📊 Management API

### GET /proxy-health
Health check endpoint for monitoring.

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

```json
{
  "name": "@scrapix/proxy",
  "version": "0.1.0",
  "type": "HTTP/HTTPS Proxy",
  "region": "iad",
  "uptime": 3600,
  "authEnabled": true,
  "authType": "basic",
  "usage": {
    "http": "http://user:pass@proxy.example.com:8080",
    "https": "http://user:pass@proxy.example.com:8080"
  }
}
```

## 🛠️ Development

```bash
# Install dependencies
yarn install

# Development mode with auto-reload
yarn dev

# Build TypeScript
yarn build

# Start production server
yarn start

# Run tests
yarn test

# Lint code
yarn lint
```

## 🚀 Deployment

### Docker

```bash
# Build image
docker build -t scrapix-proxy .

# Run with authentication
docker run -p 8080:8080 -p 3000:3000 \
  -e PROXY_AUTH_ENABLED=true \
  -e PROXY_AUTH_TYPE=basic \
  -e PROXY_AUTH_USERS="user1:pass1" \
  scrapix-proxy
```

### Docker Compose

```yaml
version: '3.8'
services:
  proxy:
    image: scrapix-proxy
    ports:
      - "8080:8080"
      - "3000:3000"
    environment:
      - PROXY_AUTH_ENABLED=true
      - PROXY_AUTH_TYPE=bearer
      - PROXY_AUTH_TOKENS=${PROXY_TOKENS}
    restart: unless-stopped
```

### Fly.io Multi-Region

Deploy to multiple regions for IP diversity:

```bash
# Deploy to US East
fly deploy --app scrapix-proxy-iad --region iad

# Deploy to Europe
fly deploy --app scrapix-proxy-lhr --region lhr

# Deploy to Asia
fly deploy --app scrapix-proxy-sin --region sin
```

## 🔒 Security Considerations

1. **Always enable authentication in production** to prevent unauthorized usage
2. **Use HTTPS** for management endpoints when exposed publicly
3. **Rotate tokens regularly** for bearer authentication
4. **Monitor logs** for suspicious activity
5. **Set up rate limiting** at the infrastructure level if needed

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Crawler   │────▶│ Proxy Server│────▶│   Target    │
│   Client    │     │   (Auth)    │     │   Website   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Management  │
                    │     API     │
                    └─────────────┘
```

## 📄 License

MIT