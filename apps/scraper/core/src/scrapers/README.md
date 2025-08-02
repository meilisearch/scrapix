# Scrapers

This directory contains the content extraction and processing system that transforms raw HTML into structured documents for Meilisearch.

## 🏗️ Architecture

The scraper system implements a feature pipeline pattern where each feature processes documents sequentially:

```
scrapers/
├── index.ts      # Main Scraper class and orchestration
└── features/     # Individual feature processors
    ├── ai_extraction.ts    # AI-powered data extraction
    ├── ai_summary.ts       # AI-generated summaries
    ├── block_split.ts      # Document splitting logic
    ├── custom_selectors.ts # CSS selector extraction
    ├── full_page.ts        # Full page content
    ├── markdown.ts         # HTML to Markdown conversion
    ├── metadata.ts         # Meta tag extraction
    └── schema.ts           # Schema.org extraction
```

## 📋 Core Concept

The Scraper processes web pages through a configurable pipeline:

1. **Full Page Processing**: Creates initial document structure
2. **Feature Pipeline**: Each enabled feature enriches the document
3. **Block Splitting**: Optionally splits into smaller searchable blocks
4. **Document Output**: Sends to Meilisearch via Sender

## 🔧 Main Components

### `index.ts` - Scraper Class

The main orchestrator that:
- Manages feature pipeline execution
- Handles feature activation based on configuration
- Implements URL pattern matching for features
- Coordinates document flow to Sender

Key methods:
- `get(url, $)`: Main entry point for processing a page
- `shouldProcessFeature()`: Determines if a feature should run
- `matchesPattern()`: URL pattern matching logic

### Feature Pipeline Order

Features are processed in this specific order:
1. `full_page` - Base document creation
2. `metadata` - Meta tag enrichment
3. `custom_selectors` - Custom data extraction
4. `markdown` - Content format conversion
5. `schema` - Structured data extraction
6. `ai_extraction` - AI-powered extraction
7. `ai_summary` - AI summarization
8. `block_split` - Document splitting (if enabled)

## 📦 Feature Configuration

Each feature can be configured with:

```typescript
{
  "features": {
    "feature_name": {
      "activated": true,              // Enable/disable
      "include_pages": ["**/blog/*"], // URL patterns to include
      "exclude_pages": ["*/admin/*"], // URL patterns to exclude
      // Feature-specific options...
    }
  }
}
```

## 🎯 URL Pattern Matching

Features support glob-style patterns:
- `*` - Match any characters except /
- `**` - Match any characters including /
- `?` - Match single character

Examples:
- `*/blog/*` - Blog posts in any domain
- `**/*.pdf` - All PDF files
- `example.com/products/*` - Product pages

## 🔄 Document Flow

```typescript
// 1. Initial document from full page
let document: FullPageDocument = await processFullPage($, url, config);

// 2. Process through features
document = await processMetadata($, document, config);
document = await processCustomSelectors($, document, config);
// ... more features

// 3. Split if needed
let documents: BlockDocument[] = [];
if (features.block_split?.activated) {
  documents = await processBlockSplit($, document, config);
} else {
  documents.push(document);
}

// 4. Send to Meilisearch
for (const doc of documents) {
  await sender.add(doc);
}
```

## 🚀 Creating Custom Features

To add a new feature:

1. Create a new file in `features/`
2. Export a process function:

```typescript
export async function processMyFeature(
  $: CheerioAPI,
  document: FullPageDocument,
  config: Config
): Promise<FullPageDocument> {
  // Feature implementation
  return {
    ...document,
    myData: extractedData
  };
}
```

3. Add to the pipeline in `index.ts`
4. Update configuration types

## 🐛 Common Patterns

### Feature Guards

Always check if feature should run:

```typescript
if (!this.shouldProcessFeature(features.my_feature, url)) {
  return document;
}
```

### Error Handling

Features should gracefully handle errors:

```typescript
try {
  // Feature logic
} catch (error) {
  log.error('Feature failed', { error });
  return document; // Return unchanged
}
```

### Document Enrichment

Features should add to, not replace, existing data:

```typescript
return {
  ...document,           // Preserve existing
  newField: newData     // Add new data
};
```

## 📊 Performance Considerations

- Features run sequentially - order matters for dependencies
- Heavy features (AI) should run last
- Use `include_pages`/`exclude_pages` to limit processing
- Block splitting significantly increases document count

## 🔍 Debugging

Enable debug logging to see feature execution:

```bash
DEBUG=scrapix:scraper:* yarn start
```

This will show:
- Which features are activated
- URL pattern matching results
- Feature processing times
- Document transformation steps