import { Settings } from "meilisearch";
import { CheerioAPI } from "cheerio";

export type CrawlerType = "cheerio" | "puppeteer" | "playwright";
export type Strategy =
  | "docssearch"
  | "default"
  | "schema"
  | "markdown"
  | "custom";

export interface Config {
  /** Required Meilisearch Configuration */

  /** The unique identifier for the Meilisearch index */
  meilisearch_index_uid: string;

  /** The URL of the Meilisearch server instance */
  meilisearch_url: string;

  /** The API key for authenticating with Meilisearch */
  meilisearch_api_key: string;

  /** Required Crawling Configuration */

  /**
   * Array of URLs where crawling will begin. These URLs are:
   * 1. Added to the initial crawling queue
   * 2. Used to generate URL patterns that determine which additional URLs to crawl
   *
   * Example: If start_urls = ["https://example.com"], only URLs beginning with
   * "https://example.com" will be crawled
   */
  start_urls: string[];

  /** Type of crawler to use for web scraping
   *
   * Specifies which web scraping engine to use. Each has different tradeoffs:
   *
   * - `cheerio`: Fast and lightweight HTML parser. Best for static sites.
   *   - Pros: Fastest option, low memory usage
   *   - Cons: Cannot execute JavaScript or render dynamic content
   *   - Recommended for: Static websites, documentation sites
   *
   * - `puppeteer`: Full Chrome browser automation.
   *   - Pros: Can execute JavaScript, render dynamic content
   *   - Cons: Higher resource usage, slower than cheerio
   *   - Recommended for: Single page applications (SPAs), JavaScript-heavy sites
   *
   * - `playwright` (beta): Modern browser automation framework.
   *   - Pros: Cross-browser support, modern APIs
   *   - Cons: Higher resource usage, slower than cheerio
   *   - Recommended for: Testing cross-browser compatibility
   *   - Note: Currently in beta, API may change
   *
   * Choose based on your site's requirements:
   * - Use `cheerio` for static content (fastest)
   * - Use `puppeteer`/`playwright` for dynamic JavaScript content
   *
   * @default "cheerio"
   */
  crawler_type: CrawlerType;

  /** Content Extraction Configuration */

  /** Content extraction strategy to use
   *
   * Specifies how content should be extracted from crawled web pages. Available strategies:
   *
   * `default`: General-purpose strategy suitable for any website. Creates a hierarchical
   *   content structure by:
   *   - Extracting all page text
   *   - Using `p` tags for content blocks
   *   - Building logical sections based on heading tags (h1-h6)
   *   - Grouping content between headings into cohesive blocks
   *
   * `docssearch`: Compatible with DocSearch plugin implementations. Preserves content
   *   structure for seamless integration with existing DocSearch frontend components.
   *
   * `schema`: Extracts structured data from Schema.org compatible websites, including:
   *   - CMS-generated content
   *   - E-commerce product pages
   *   - Rich metadata and schema-defined content blocks
   *   Ideal for sites with standardized semantic markup.
   *
   * `markdown`: Converts webpage content to Markdown format. Particularly useful for:
   *   - Documentation sites
   *   - Code-heavy content
   *   - Building RAG (Retrieval Augmented Generation) systems
   *
   * `custom`: Provides full control over content extraction through user-defined selectors.
   *   Allows precise targeting of specific page elements and custom data structures.
   *
   * @default "default"
   */
  strategy?: Strategy;

  /** Custom CSS selectors for content extraction
   *
   * Only used when the strategy is set to `custom`.
   * Those will be the selectors used to extract the content from the page.
   *
   * e.g.
   * ```ts
   * selectors: {
   *   title: "h1",
   *   content: ["p", "div.content"]
   * }
   * ```
   *
   * @default null
   */
  selectors?: Record<string, string>;

  /** Settings for schema-based extraction
   * Those settings are usefull only if strategy is set to `schema`.
   *
   * This allow to get more fine-grained control over the data extracted from the pages. Like getting only some specific types of data.
   *
   * For the list of the supported types, see https://schema.org/docs/full.html
   *
   * @default { convert_dates: false, only_type: null }
   */
  schema_settings?: SchemaSettings;

  /** URL Control Configuration */

  /** URLs to skip during crawling
   *
   * An array of URLs that will be excluded from the crawling process. The crawler will not visit or process these URLs.
   * Supports glob patterns for flexible URL matching.
   *
   * Example:
   * ```ts
   * urls_to_exclude: [
   *   "https://example.com/private", // Exclude all URLs under /private
   * ]
   * ```
   *
   * Default: No URLs will be excluded.
   * @default []
   */
  urls_to_exclude?: string[];

  /** Specific URLs to index (overrides start_urls if provided)
   *
   * Allows you to specify an exact list of URLs that should be indexed, overriding the start_urls
   * crawling configuration. This is useful when you want to:
   *
   * - Crawl a large site but only index specific sections
   * - Index a subset of pages while still crawling the full site structure
   * - Precisely control which content gets added to your search index
   *
   * The crawler will still traverse all URLs according to the crawling rules, but will only
   * extract and index content from URLs that match this list.
   *
   * When adding URLs to this list, keep in mind that it will also add all the sub-pages.
   *
   * Example:
   * ```ts
   * urls_to_index: [
   *   "https://example.com/products",
   * ]
   * ```
   *
   * Supports glob patterns:
   * - `*` matches any sequence within a path segment
   * - `**` matches across path segments
   *
   * @default []
   */
  urls_to_index?: string[];

  /** URLs to exclude from indexing
   *
   * Allows you to specify URLs that should be excluded from indexing, even if they match
   * start_urls or urls_to_index patterns. The crawler will still traverse these URLs but
   * won't extract or index their content.
   *
   * This is useful when you want to:
   * - Exclude specific pages or sections from appearing in search results
   * - Skip indexing duplicate/mirror pages to avoid content duplication
   * - Prevent indexing of sensitive, private or internal pages
   * - Exclude dynamically generated pages with duplicate content
   * - Skip indexing of utility pages like login, admin, etc.
   *
   * Supports glob patterns:
   * - `*` matches any sequence within a path segment
   * - `**` matches across path segments
   *
   * Example:
   * ```ts
   * urls_to_not_index: [
   *   "https://example.com/private",    // Exclude all pages under /private
   *   "https://example.com/login",      // Exclude specific page
   * ]
   * ```
   *
   * @default []
   */
  urls_to_not_index?: string[];

  /** Performance Configuration */

  /** Maximum number of concurrent requests
   *
   * Allow to rate limit the crawler by limiting the number of concurrent requests.
   * The crawler will start slowly to crawl the site, and increase the concurrency until it reaches the limit.
   *
   * @default Infinity
   */
  max_concurrency?: number;

  /** Maximum requests per minute rate limit
   *
   * This controls how many total requests can be made per minute. It counts the amount of requests done every second, to ensure there is not a burst of requests at the `maxConcurrency` limit followed by a long period of waiting. By default, it is set to `Infinity` which means the crawler will keep going up to the `maxConcurrency`. We would set this if we wanted our crawler to work at full throughput, but also not keep hitting the website we're crawling with non-stop requests.
   * @default Infinity
   */
  max_requests_per_minute?: number;

  /** Number of documents to index in each batch
   *
   * Controls how many documents are sent to Meilisearch in a single indexing request.
   * Considerations for setting this value:
   * - Higher values improve indexing throughput
   * - Lower values provide more frequent progress feedback
   * - Memory usage increases with batch size
   * - Network stability may affect optimal batch size
   *
   * Example:
   * ```ts
   * batch_size: 500 // Send documents in batches of 500
   * ```
   *
   * Default: 1000 documents per batch
   * @default 1000
   */
  batch_size?: number;

  /** Meilisearch Configuration */

  /** Primary key field for Meilisearch documents
   *
   * Specifies which field should be used as the unique identifier for documents in the Meilisearch index.
   * This field must:
   * - Be present in all documents
   * - Contain unique values
   * - Not change over time
   *
   * Example:
   * ```ts
   * primary_key: "product_id" // Use product_id field as unique identifier
   * ```
   *
   * Default: A random UUID will be generated and stored in the `uid` field.
   */
  primary_key?: string;

  /** Custom Meilisearch index settings.
   * These settings will be applied to the Meilisearch index each time the crawler runs.
   * This will override any existing settings on the index.
   *
   * Common settings include:
   * - searchableAttributes: Fields that can be searched
   * - filterableAttributes: Fields that can be filtered
   * - sortableAttributes: Fields that can be sorted
   * - distinctAttribute: Field used for deduplication
   * - rankingRules: Rules that determine search result order
   * - stopWords: Words to ignore during search
   * - synonyms: Word equivalences for search
   *
   * Example:
   * ```ts
   * meilisearch_settings: {
   *   searchableAttributes: ['title', 'content'],
   *   filterableAttributes: ['category'],
   *   distinctAttribute: 'url'
   * }
   * ```
   *
   * @see https://www.meilisearch.com/docs/learn/configuration/settings
   *
   * Default: Strategy-specific settings will be applied.
   */
  meilisearch_settings?: Settings;

  /** Request Configuration */

  /** Custom headers to include with HTTP requests
   *
   * Allows adding custom HTTP headers to all requests made during crawling.
   * Common use cases:
   * - Authentication headers for protected sites
   * - Custom user agents
   * - API keys or tokens
   *
   * Example:
   * ```ts
   * additional_request_headers: {
   *   "Authorization": "Bearer token123",
   *   "User-Agent": "Custom Bot 1.0"
   * }
   * ```
   *
   * Default: No additional headers will be added.
   * @default {}
   */
  additional_request_headers?: Record<string, string>;

  /** Custom User-Agent strings to rotate through
   * Used to send a custom user agent to Meilisearch.
   *
   * @default []
   */
  user_agents?: string[];

  /** Custom Puppeteer instance
   * Not useful for most users, but can be used to pass custom options to the Puppeteer instance.
   * @default null
   */
  launch_options?: Record<string, any>;

  /** Webhook Configuration */

  /** URL to send webhook notifications to
   *
   * When configured, the crawler will send HTTP POST notifications to this URL
   * at key points during execution:
   * - started: When crawling begins
   * - active: During crawling with current progress
   * - paused: If crawling is paused
   * - completed: When crawling finishes successfully
   * - failed: If an error occurs
   *
   * The payload will include:
   * - status: The notification type (see above)
   * - date: ISO timestamp
   * - meilisearch_url: Target Meilisearch instance
   * - meilisearch_index_uid: Target index
   * - webhook_payload: Any custom payload if configured
   * - error: Error message if status is "failed"
   * - nb_documents_sent: Document count if status is "completed"
   *
   * @default null
   */
  webhook_url?: string;

  /** Custom payload to include in webhook requests
   *
   * Additional data that will be included in every webhook notification payload.
   * Only applies when webhooks are enabled via webhook_url.
   *
   * This allows you to add custom context or metadata to help identify and process
   * webhook notifications in your application.
   *
   * Example:
   * ```ts
   * webhook_payload: {
   *   environment: 'production',
   *   source: 'docs-crawler',
   *   version: '1.0.0'
   * }
   * ```
   *
   * @default {}
   */
  webhook_payload?: Record<string, any>;

  /** Error Detection */

  /** Selectors that indicate a page was not found
   * Interesting if you see some 404 pages in the answer of your searches. You can here add some selector to identify if the page is a 404. In some case the not found page are responing a 200 with a message "Page not found".
   *
   * e.g.
   * ```ts
   * not_found_selectors: ["h1.error-message", "h1:contains('Page not found')"]
   * ```
   *
   * The selectors are JQuery selector used by Cheerio.
   *
   * @default []
   */
  not_found_selectors?: string[];
}

export type SchemaSettings = {
  /** Convert dates to timestamp format
   *
   * Dates on schema.org are often represented as strings with the format "2024-01-01". This option will convert those dates to timestamp format, which is easier for search engines to understand.
   *
   * @default false
   */
  convert_dates: boolean;

  /** Only extract data from the specified type
   *
   * See type list here: https://schema.org/docs/full.html
   *
   * @default null
   */
  only_type: string;
};

export type Scraper = {
  get: (url: string, $: CheerioAPI) => Promise<void>;
};

export type DocumentType =
  | DocsSearchDocument
  | DefaultDocument
  | SchemaDocument
  | MarkdownDocument
  | CustomDocument;

export type HierarchyLevel = {
  hierarchy_lvl0?: string | null;
  hierarchy_lvl1?: string | null;
  hierarchy_lvl2?: string | null;
  hierarchy_lvl3?: string | null;
  hierarchy_lvl4?: string | null;
  hierarchy_lvl5?: string | null;
};

export type RadioHierarchyLevel = {
  hierarchy_radio_lvl0?: string | null;
  hierarchy_radio_lvl1?: string | null;
  hierarchy_radio_lvl2?: string | null;
  hierarchy_radio_lvl3?: string | null;
  hierarchy_radio_lvl4?: string | null;
  hierarchy_radio_lvl5?: string | null;
};

export type HTag = "H1" | "H2" | "H3" | "H4" | "H5";

export type DocsSearchDocument = HierarchyLevel &
  RadioHierarchyLevel & {
    url: string;
    uid?: string;
    anchor: string;
    content?: string[] | string;
    level: number;
    type: "lvl0" | "lvl1" | "lvl2" | "lvl3" | "lvl4" | "lvl5" | "content";
  };

export type DefaultDocument = {
  url: string;
  uid?: string;
  anchor: string;
  title: string;
  meta: Meta;
  image_url?: string;
  page_block: number;
  urls_tags: string[];
  h1?: string | null;
  h2?: string | null;
  h3?: string | null;
  h4?: string | null;
  h5?: string | null;
  h6?: string | null;
  p: string[] | string;
};

export type SchemaDocument = {
  uid: string;
  [key: string]: any;
};

export type Meta = {
  [name: string]: string;
};

export type MarkdownDocument = {
  uid: string;
  url: string;
  title: string;
  description: string;
  content: string;
  urls_tags: string[];
  meta?: Meta;
};

export type CustomDocument = {
  uid: string;
  [key: string]: any;
};
