# Scrapix Playground

A Next.js test website designed to validate and demonstrate Scrapix crawling capabilities. This app simulates a real e-commerce site with various content types and edge cases.

## 🎯 Purpose

This playground serves as a comprehensive test environment for Scrapix, featuring:
- Various content types (static, dynamic, paginated)
- Different data formats (HTML, JSON-LD, PDF)
- Edge cases (404 pages, client-side rendering)
- SEO patterns (meta tags, schema.org)

## 🏗️ Architecture

Built with Next.js 15 and TypeScript, featuring:

- **Static Site Generation (SSG)**: Pre-rendered pages for performance
- **Client-Side Rendering**: Dynamic content to test JavaScript crawlers
- **Tailwind CSS**: Modern styling
- **Schema.org**: Structured data for testing extraction

## 📄 Pages Overview

### 🏠 Home Page (`/`)
- Hero section with featured cheeses
- Tests basic content extraction

### 📝 Blog (`/blog`, `/posts/[slug]`)
- Static pages generated from Markdown files
- Tests markdown content extraction
- Individual posts with rich formatting

### 🧀 Products (`/products`, `/products/[slug]`)
- Paginated cheese catalog (1188 items)
- Individual product pages with:
  - Static content (title, description, price)
  - Dynamic attributes (loaded client-side)
  - JSON-LD schema for each product
  - Signature text for removal testing

### 📚 References (`/references`)
- PDF files for testing PDF extraction
- Intentional 404 links for error handling
- Various document types

## 🚀 Development

```bash
# Install dependencies
yarn install

# Run development server
yarn dev

# Build for production
yarn build

# Start production server
yarn start
```

## 🧪 Testing Scenarios

### 1. Basic Crawling
```json
{
  "start_urls": ["http://localhost:3000"],
  "crawler_type": "cheerio"
}
```

### 2. JavaScript Content
```json
{
  "start_urls": ["http://localhost:3000/products"],
  "crawler_type": "puppeteer",
  "features": {
    "schema": { "activated": true }
  }
}
```

### 3. PDF Extraction
```json
{
  "start_urls": ["http://localhost:3000/references"],
  "features": {
    "pdf": { 
      "activated": true,
      "extract_content": true
    }
  }
}
```

### 4. Custom Selectors
```json
{
  "features": {
    "custom_selectors": {
      "activated": true,
      "selectors": {
        "cheese_name": "h1",
        "price": ".text-3xl.font-bold",
        "description": ".prose"
      }
    }
  }
}
```

## 📊 Test Data

- **Cheeses**: 1188 varieties from `_data/cheeses.json`
- **Blog Posts**: 3 articles about cheese
- **PDFs**: 3 cheese documentation files
- **Images**: Product and blog images

## 🐛 Debugging

Common test scenarios:

1. **Pagination**: Products are paginated (50/page)
2. **Client-Side Data**: Product attributes load dynamically
3. **404 Handling**: Some reference links intentionally 404
4. **Schema Extraction**: All products have JSON-LD
5. **Content Removal**: Signature text should be filtered

## 🐳 Docker

```bash
# Build image
docker build -t scrapix-playground .

# Run container
docker run -p 3000:3000 scrapix-playground
```

## 📝 Adding Test Cases

To add new test scenarios:

1. **New Products**: Add to `_data/cheeses.json`
2. **Blog Posts**: Create `.md` files in `_posts/`
3. **PDFs**: Add to `public/assets/pdfs/`
4. **Pages**: Create new routes in `src/app/`

## 📄 License

MIT 