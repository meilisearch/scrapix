# Utils

Utility functions and helper modules that support the core crawling and scraping functionality.

## 📁 Module Overview

### 🧹 `html_cleaner.ts` - HTML Content Cleaning
Provides utilities for cleaning and normalizing HTML content before processing.

**Key Functions:**
- `cleanHTML()`: Removes scripts, styles, and unwanted elements
- `normalizeWhitespace()`: Normalizes spacing and line breaks
- `removeComments()`: Strips HTML comments
- `sanitizeAttributes()`: Removes potentially harmful attributes

**Usage:**
```typescript
import { cleanHTML } from './utils/html_cleaner';

const cleanedContent = cleanHTML(rawHTML, {
  removeScripts: true,
  removeStyles: true,
  removeComments: true
});
```

### 🔍 `meilisearch_client.ts` - Meilisearch Integration
Handles all interactions with the Meilisearch search engine.

**Key Features:**
- Client initialization with error handling
- Index management (create, swap, delete)
- Settings configuration
- Health checks
- Batch document operations

**Configuration:**
```typescript
const client = getMeilisearchClient(
  'http://localhost:7700',
  'masterKey'
);
```

**Index Operations:**
- Creates temporary index for atomic updates
- Applies custom settings
- Performs index swapping for zero-downtime updates
- Handles cleanup of old indices

### 📦 `package_version.ts` - Version Management
Extracts and manages package version information for user agent strings and telemetry.

**Purpose:**
- Provides consistent version strings across the application
- Helps with debugging and support
- Used in HTTP headers for API requests

**Usage:**
```typescript
import { getPackageVersion } from './utils/package_version';

const version = getPackageVersion();
// Returns: "0.1.9"
```

### 🗺️ `sitemap.ts` - Sitemap Processing
Extracts URLs from XML sitemaps for comprehensive site crawling.

**Features:**
- Parses standard sitemap.xml files
- Handles sitemap index files
- Recursive sitemap discovery
- Error resilient parsing
- URL filtering and validation

**Usage:**
```typescript
import { extractUrlsFromSitemap } from './utils/sitemap';

const urls = await extractUrlsFromSitemap([
  'https://example.com/sitemap.xml',
  'https://example.com/sitemap-index.xml'
]);
```

**Sitemap Support:**
- Standard sitemaps (sitemap.xml)
- Sitemap indices (links to multiple sitemaps)
- Compressed sitemaps (.gz)
- News and video sitemaps

## 🔧 Common Patterns

### Error Handling

All utilities follow consistent error handling:

```typescript
try {
  // Operation
} catch (error) {
  log.error('Operation failed', { error });
  // Graceful fallback
  return defaultValue;
}
```

### Logging

Utilities use the Crawlee logging system:

```typescript
import { Log } from 'crawlee';

const log = new Log({ prefix: 'Utils' });
log.info('Processing started');
log.error('Error occurred', { details });
```

### Type Safety

All utilities are fully typed:

```typescript
export interface CleanOptions {
  removeScripts?: boolean;
  removeStyles?: boolean;
  removeComments?: boolean;
  allowedTags?: string[];
}
```

## 🚀 Adding New Utilities

When creating new utility functions:

1. **Single Responsibility**: Each utility should do one thing well
2. **Error Resilience**: Handle errors gracefully
3. **Type Definitions**: Provide TypeScript types
4. **Documentation**: Include JSDoc comments
5. **Testing**: Consider edge cases

Example template:

```typescript
import { Log } from 'crawlee';

const log = new Log({ prefix: 'MyUtil' });

/**
 * Processes data according to specified rules
 * @param data - Input data to process
 * @param options - Processing options
 * @returns Processed result
 */
export function processData<T>(
  data: T,
  options: ProcessOptions = {}
): ProcessedData<T> {
  try {
    // Implementation
    return result;
  } catch (error) {
    log.error('Processing failed', { error });
    throw new Error(`Failed to process data: ${error.message}`);
  }
}
```

## 📊 Performance Tips

### Meilisearch Client
- Reuse client instances
- Batch document operations
- Use appropriate batch sizes (default: 1000)
- Monitor index swap performance

### HTML Cleaning
- Cache cleaned content when possible
- Use specific options to avoid unnecessary processing
- Consider streaming for large documents

### Sitemap Processing
- Implement caching for frequently accessed sitemaps
- Set reasonable timeouts for HTTP requests
- Handle large sitemaps in chunks
- Validate URLs before adding to queue

## 🐛 Debugging

Enable debug logging for detailed utility operations:

```bash
DEBUG=scrapix:utils:* yarn start
```

Individual utilities:
```bash
DEBUG=scrapix:utils:meilisearch yarn start
DEBUG=scrapix:utils:sitemap yarn start
```

## 🔗 Dependencies

- **Meilisearch**: Official Meilisearch JavaScript client
- **fast-xml-parser**: High-performance XML parsing for sitemaps
- **cheerio**: Server-side DOM manipulation (used by html_cleaner)
- **node:fs**: File system operations for package version