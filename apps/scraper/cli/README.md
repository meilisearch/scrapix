# @scrapix/cli

Command-line interface for Scrapix web crawler.

## 🚀 Features

- **Direct Crawling**: Run crawls directly from the command line
- **Flexible Configuration**: Use JSON files or inline configuration
- **Custom Browser Support**: Specify browser path for Puppeteer/Playwright
- **Real-time Progress**: See crawling progress in your terminal
- **Full Feature Access**: All core features available via CLI

## 📦 Installation

```bash
# From the CLI directory
yarn install
yarn build

# Or install globally (after publishing)
npm install -g @scrapix/cli
```

## 🔧 Usage

### Basic Usage

```bash
# Using a configuration file
yarn start -p config.json

# Using inline configuration
yarn start -c '{"start_urls":["https://example.com"],"meilisearch_url":"http://localhost:7700","meilisearch_api_key":"masterKey","meilisearch_index_uid":"my_index"}'

# With custom browser path
yarn start -p config.json -b "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

### Command Line Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--configPath` | `-p` | Path to JSON configuration file |
| `--config` | `-c` | Inline JSON configuration string |
| `--browserPath` | `-b` | Path to browser executable (Puppeteer/Playwright) |

### Configuration Examples

```bash
# Simple website crawl
yarn start -p ../../../misc/config_examples/default-simple.json

# Documentation site with AI summary
yarn start -p ../../../misc/config_examples/openai-docsearch-strat.json

# E-commerce with schema extraction
yarn start -p ../../../misc/config_examples/schema-config.json

# PDF extraction
yarn start -p ../../../misc/config_examples/pdf-crawler.json
```

## 📋 Configuration File Format

Create a `config.json` file:

```json
{
  "crawler_type": "cheerio",
  "start_urls": ["https://example.com"],
  "meilisearch_url": "http://localhost:7700",
  "meilisearch_api_key": "masterKey",
  "meilisearch_index_uid": "my_index",
  "max_concurrency": 10,
  "features": {
    "block_split": {
      "activated": true
    },
    "metadata": {
      "activated": true
    }
  }
}
```

## 🏗️ Advanced Configuration

### AI-Powered Extraction

```json
{
  "features": {
    "ai_extraction": {
      "activated": true,
      "prompt": "Extract product information including name, price, and availability"
    },
    "ai_summary": {
      "activated": true
    }
  }
}
```

**Required**: Set `OPENAI_API_KEY` environment variable.

### Proxy Configuration

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

### Custom Selectors

```json
{
  "features": {
    "custom_selectors": {
      "activated": true,
      "selectors": {
        "title": "h1.product-title",
        "price": ".price-tag",
        "description": ".product-description"
      }
    }
  }
}
```

## 🛠️ Development

```bash
# Install dependencies
yarn install

# Build TypeScript
yarn build

# Run in development
yarn dev

# Run with example config
yarn start -p ../../../misc/config_examples/default-simple.json
```

## 🐛 Debugging

Enable debug logs:

```bash
DEBUG=* yarn start -p config.json
```

Common issues:

1. **Module not found**: Make sure to build the core package first
2. **Browser not found**: Use full path to browser executable
3. **Connection refused**: Check Meilisearch is running and accessible

## 📄 License

MIT