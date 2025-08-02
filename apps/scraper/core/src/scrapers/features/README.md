# Scraper Features

Individual feature processors that extract and transform content from web pages. Each feature is designed to be independent and composable within the processing pipeline.

## 📋 Available Features

### 🤖 `ai_extraction.ts` - AI-Powered Extraction
Leverages OpenAI GPT models to extract structured data from unstructured content.

**Use Cases:**
- Product information extraction
- Contact details parsing
- Event data structuring
- Custom entity extraction

**Configuration:**
```json
{
  "ai_extraction": {
    "activated": true,
    "prompt": "Extract product name, price, and availability",
    "include_pages": ["*/products/*"]
  }
}
```

**Requirements:** `OPENAI_API_KEY` environment variable

### 📝 `ai_summary.ts` - AI Summarization
Generates concise, search-optimized summaries of page content.

**Use Cases:**
- Long article summarization
- Documentation overview
- Product description summaries
- Content previews

**Configuration:**
```json
{
  "ai_summary": {
    "activated": true,
    "include_pages": ["*/blog/*", "*/docs/*"]
  }
}
```

### 📦 `block_split.ts` - Content Block Splitting
Splits pages into semantic blocks for granular search results.

**Use Cases:**
- Documentation sites
- Long-form content
- FAQ pages
- Technical guides

**How it Works:**
- Identifies content hierarchies (h1 → h6)
- Groups related paragraphs with their headings
- Maintains context through heading chains
- Generates unique anchors for each block

**Configuration:**
```json
{
  "block_split": {
    "activated": true,
    "include_pages": ["*"]
  }
}
```

### 🎯 `custom_selectors.ts` - CSS Selector Extraction
Extracts specific data using CSS selectors.

**Use Cases:**
- E-commerce product details
- Structured data extraction
- Form field values
- Specific element targeting

**Configuration:**
```json
{
  "custom_selectors": {
    "activated": true,
    "selectors": {
      "product_name": "h1.product-title",
      "price": ".price-tag",
      "availability": ".stock-status",
      "reviews": ".review-item"
    }
  }
}
```

### 📄 `full_page.ts` - Full Page Processing
Creates the base document structure from the entire page.

**What it Extracts:**
- Page title
- URL and pathname
- Meta description
- All text content
- Content hierarchy

**Note:** This feature always runs first and cannot be disabled.

### 📝 `markdown.ts` - Markdown Conversion
Converts HTML content to clean Markdown format.

**Use Cases:**
- Documentation preservation
- Content migration
- Readable text extraction
- Cross-platform content

**Configuration:**
```json
{
  "markdown": {
    "activated": true,
    "include_pages": ["*/docs/*", "*/guides/*"]
  }
}
```

### 🏷️ `metadata.ts` - Metadata Extraction
Extracts meta tags and document metadata.

**What it Extracts:**
- Standard meta tags (description, keywords, author)
- Open Graph tags (og:title, og:image, etc.)
- Twitter Card data
- Canonical URLs
- Language information

**Configuration:**
```json
{
  "metadata": {
    "activated": true,
    "include_pages": ["*"]
  }
}
```

### 📊 `schema.ts` - Schema.org Extraction
Parses structured data from JSON-LD and microdata.

**Supported Types:**
- Product
- Article
- Organization
- Event
- Recipe
- FAQ
- And more...

**Configuration:**
```json
{
  "schema": {
    "activated": true,
    "only_type": "Product",      // Optional: filter by type
    "convert_dates": true        // Convert dates to timestamps
  }
}
```

## 🔧 Feature Development Guide

### Creating a New Feature

1. **File Structure:**
```typescript
// features/my_feature.ts
import { CheerioAPI } from 'cheerio';
import { Config, FullPageDocument } from '../../types';

export async function processMyFeature(
  $: CheerioAPI,
  document: FullPageDocument,
  config: Config
): Promise<FullPageDocument> {
  const features = config.features || {};
  const featureConfig = features.my_feature || {};
  
  // Feature implementation
  
  return {
    ...document,
    myFeatureData: extractedData
  };
}
```

2. **Best Practices:**
- Always preserve existing document data
- Handle errors gracefully
- Check feature configuration
- Log important operations
- Keep features focused and single-purpose

3. **Testing Pattern:**
```typescript
// Early return if feature disabled
if (!featureConfig.activated) {
  return document;
}

// URL pattern matching (handled by Scraper)
// Feature implementation here
```

## 🎯 Feature Selection Guide

| Feature | Best For | Performance Impact | Prerequisites |
|---------|----------|-------------------|---------------|
| `block_split` | Long content, Docs | Medium | None |
| `metadata` | SEO, Discovery | Low | None |
| `custom_selectors` | Specific extraction | Low | CSS knowledge |
| `markdown` | Content portability | Low | None |
| `schema` | Structured data | Low | Schema.org markup |
| `ai_extraction` | Complex extraction | High | OpenAI API |
| `ai_summary` | Content overview | High | OpenAI API |

## 🔄 Processing Order

Features are processed in a specific order to ensure dependencies are met:

1. **full_page** - Base document (always first)
2. **metadata** - Enriches with meta information
3. **custom_selectors** - Adds custom extracted data
4. **markdown** - Converts content format
5. **schema** - Extracts structured data
6. **ai_extraction** - AI-based extraction
7. **ai_summary** - AI summarization
8. **block_split** - Splits into blocks (always last)

## 📊 Performance Considerations

- **Lightweight Features**: metadata, custom_selectors, schema
- **Medium Features**: markdown, block_split
- **Heavy Features**: ai_extraction, ai_summary (API calls)

Use `include_pages` and `exclude_pages` to limit feature processing to relevant pages only.

## 🐛 Common Issues

1. **AI Features Not Working**
   - Check `OPENAI_API_KEY` is set
   - Verify API quotas and limits
   - Monitor rate limiting

2. **Selectors Not Matching**
   - Verify selector syntax
   - Check if content is dynamically loaded
   - Use browser crawler for JS-rendered content

3. **Block Split Creating Too Many Documents**
   - Consider excluding pages with repetitive content
   - Adjust heading detection logic
   - Monitor document count in Meilisearch