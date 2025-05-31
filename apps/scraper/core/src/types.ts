import { Settings } from 'meilisearch'
import { CheerioAPI } from 'cheerio'
import { z } from 'zod'

export const ConfigSchema = z.object({
  // Required Meilisearch Configuration
  meilisearch_index_uid: z.string(),
  meilisearch_url: z.string().url(),
  meilisearch_api_key: z.string(),

  // Required Crawling Configuration
  start_urls: z.array(z.string().url()),
  crawler_type: z
    .enum(['cheerio', 'puppeteer', 'playwright'])
    .optional()
    .default('cheerio'),

  // Proxy Configuration
  proxy_configuration: z
    .object({
      proxyUrls: z.array(z.string().url()).optional(),
      tieredProxyUrls: z.array(z.array(z.string().url())).optional(),
    })
    .optional(),

  // Features Configuration
  features: z
    .object({
      block_split: z
        .object({
          activated: z.boolean().optional(),
          include_pages: z.array(z.string()).optional(),
          exclude_pages: z.array(z.string()).optional(),
        })
        .optional()
        .default({
          activated: false,
        }),
      metadata: z
        .object({
          activated: z.boolean().optional(),
          include_pages: z.array(z.string()).optional(),
          exclude_pages: z.array(z.string()).optional(),
        })
        .optional()
        .default({
          activated: false,
        }),
      custom_selectors: z
        .object({
          activated: z.boolean().optional(),
          include_pages: z.array(z.string()).optional(),
          exclude_pages: z.array(z.string()).optional(),
          selectors: z
            .record(z.union([z.string(), z.array(z.string())]))
            .optional(),
        })
        .optional()
        .default({
          activated: false,
        }),
      markdown: z
        .object({
          activated: z.boolean().optional(),
          include_pages: z.array(z.string()).optional(),
          exclude_pages: z.array(z.string()).optional(),
        })
        .optional()
        .default({
          activated: false,
        }),
      pdf: z
        .object({
          activated: z.boolean().optional(),
          include_pages: z.array(z.string()).optional(),
          exclude_pages: z.array(z.string()).optional(),
          extract_content: z.boolean().optional().default(false),
          extract_metadata: z.boolean().optional().default(true),
        })
        .optional()
        .default({
          activated: false,
        }),
      schema: z
        .object({
          activated: z.boolean().optional(),
          include_pages: z.array(z.string()).optional(),
          exclude_pages: z.array(z.string()).optional(),
          convert_dates: z.boolean().optional().default(false),
          only_type: z.string().nullish(),
        })
        .optional()
        .default({
          activated: false,
        }),
      ai_extraction: z
        .object({
          activated: z.boolean().optional(),
          include_pages: z.array(z.string()).optional(),
          exclude_pages: z.array(z.string()).optional(),
          prompt: z.string().optional(),
        })
        .optional()
        .default({
          activated: false,
        }),
      ai_summary: z
        .object({
          activated: z.boolean().optional(),
          include_pages: z.array(z.string()).optional(),
          exclude_pages: z.array(z.string()).optional(),
        })
        .optional()
        .default({
          activated: false,
        }),
    })
    .optional(),

  // URL Control Configuration
  urls_to_exclude: z.array(z.string()).nullish(),
  urls_to_index: z.array(z.string()).nullish(),
  urls_to_not_index: z.array(z.string()).nullish(),
  use_sitemap: z.boolean().optional().default(false),
  sitemap_urls: z.array(z.string()).nullish(),

  // Performance Configuration
  max_concurrency: z.number().positive().optional(),
  max_requests_per_minute: z.number().positive().optional(),
  batch_size: z.number().positive().optional().default(1000),

  // Meilisearch Configuration
  primary_key: z.string().nullish(),
  meilisearch_settings: z.any().nullish(), // Settings type from meilisearch

  // Request Configuration
  additional_request_headers: z.record(z.string()).nullish(),
  user_agents: z.array(z.string()).optional().default([]),
  launch_options: z.record(z.any()).nullish(),

  // Webhook Configuration
  webhook_url: z.string().url().nullish(),
  webhook_payload: z.record(z.any()).nullish(),

  // Error Detection
  not_found_selectors: z.array(z.string()).nullish(),
  keep_settings: z.boolean().optional().default(false),

  // PDF Configuration
  pdf_settings: z
    .object({
      extract_content: z.boolean().optional().default(false),
      extract_metadata: z.boolean().optional().default(true),
    })
    .nullish(),
})

export type CrawlerType = 'cheerio' | 'puppeteer' | 'playwright'

export const CrawlerTypes = {
  Cheerio: 'cheerio' as CrawlerType,
  Puppeteer: 'puppeteer' as CrawlerType,
  Playwright: 'playwright' as CrawlerType,
} as const

export type Strategy = 'default'

export const Strategies = {
  Default: 'default' as Strategy,
} as const

export interface Config {
  /** Required Meilisearch Configuration */

  /** The unique identifier for the Meilisearch index */
  meilisearch_index_uid: string

  /** The URL of the Meilisearch server instance */
  meilisearch_url: string

  /** The API key for authenticating with Meilisearch */
  meilisearch_api_key: string

  /** Required Crawling Configuration */

  /**
   * Array of URLs where crawling will begin. These URLs are:
   * 1. Added to the initial crawling queue
   * 2. Used to generate URL patterns that determine which additional URLs to crawl
   * 3. Used as base URLs for sitemap discovery if use_sitemap is true
   *
   * Example: If start_urls = ["https://example.com"], only URLs beginning with
   * "https://example.com" will be crawled
   */
  start_urls: string[]

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
  crawler_type?: CrawlerType

  /** Proxy Configuration
   *
   * Configuration for using proxies with the crawler. This helps avoid IP blocking
   * and enables more reliable web scraping.
   *
   * Example:
   * ```ts
   * proxy_configuration: {
   *   proxyUrls: [
   *     'http://proxy-1.com',
   *     'http://proxy-2.com'
   *   ]
   * }
   * ```
   *
   * Or using tiered proxies:
   * ```ts
   * proxy_configuration: {
   *   tieredProxyUrls: [
   *     [null], // First try without proxy
   *     ['http://okay-proxy.com'],
   *     ['http://better-proxy.com', 'http://better-proxy-2.com'],
   *     ['http://premium-proxy.com']
   *   ]
   * }
   * ```
   *
   * @default null
   */
  proxy_configuration?: {
    /** List of proxy URLs to rotate through */
    proxyUrls?: string[]
    /** Tiered list of proxy URLs for automatic proxy rotation based on blocking */
    tieredProxyUrls?: string[][]
  } | null

  /** Features Configuration
   *
   * Configuration for various content extraction and processing features.
   * Each feature can be enabled/disabled and configured with specific settings.
   */
  features?: {
    /** Block splitting configuration */
    block_split?: {
      /** Whether to enable block splitting */
      activated?: boolean
      /** List of wildcards for pages to include */
      include_pages?: string[]
      /** List of wildcards for pages to exclude */
      exclude_pages?: string[]
    }

    /** Meta data extraction configuration */
    metadata?: {
      /** Whether to enable meta data extraction */
      activated?: boolean
      /** List of wildcards for pages to include */
      include_pages?: string[]
      /** List of wildcards for pages to exclude */
      exclude_pages?: string[]
    }

    /** Custom selectors configuration */
    custom_selectors?: {
      /** Whether to enable custom selectors */
      activated?: boolean
      /** List of wildcards for pages to include */
      include_pages?: string[]
      /** List of wildcards for pages to exclude */
      exclude_pages?: string[]
      /** Custom selectors to use */
      selectors?: Record<string, string | string[]>
    }

    /** Markdown conversion configuration */
    markdown?: {
      /** Whether to enable markdown conversion */
      activated?: boolean
      /** List of wildcards for pages to include */
      include_pages?: string[]
      /** List of wildcards for pages to exclude */
      exclude_pages?: string[]
    }

    /** PDF extraction configuration */
    pdf?: {
      /** Whether to enable PDF extraction */
      activated?: boolean
      /** List of wildcards for pages to include */
      include_pages?: string[]
      /** List of wildcards for pages to exclude */
      exclude_pages?: string[]
      /** Whether to extract PDF content */
      extract_content?: boolean
      /** Whether to extract PDF metadata */
      extract_metadata?: boolean
    }

    /** Schema.org extraction configuration */
    schema?: {
      /** Whether to enable schema extraction */
      activated?: boolean
      /** List of wildcards for pages to include */
      include_pages?: string[]
      /** List of wildcards for pages to exclude */
      exclude_pages?: string[]
      /** Whether to convert dates to timestamp format */
      convert_dates?: boolean
      /** Only extract data from the specified type */
      only_type?: string | null
    }

    /** AI extraction configuration */
    ai_extraction?: {
      /** Whether to enable AI extraction */
      activated?: boolean
      /** List of wildcards for pages to include */
      include_pages?: string[]
      /** List of wildcards for pages to exclude */
      exclude_pages?: string[]
      /** Prompt to use for extraction */
      prompt?: string | null
    }

    /** AI summary configuration */
    ai_summary?: {
      /** Whether to enable AI summary */
      activated?: boolean
      /** List of wildcards for pages to include */
      include_pages?: string[]
      /** List of wildcards for pages to exclude */
      exclude_pages?: string[]
    }
  }

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
   * @default null
   */
  urls_to_exclude?: string[] | null

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
   * @default null
   */
  urls_to_index?: string[] | null

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
   * @default null
   */
  urls_to_not_index?: string[] | null

  /** Whether to use sitemap for URL discovery
   *
   * When enabled (default), the crawler will:
   * 1. Try to find sitemaps at common locations (/sitemap.xml, /sitemap_index.xml, etc.)
   * 2. Parse robots.txt for Sitemap directives
   * 3. Extract URLs from all discovered sitemaps
   * 4. Add found URLs to the crawling queue
   *
   * If no sitemaps are found or if disabled, the crawler will use start_urls directly.
   *
   * @default false
   */
  use_sitemap?: boolean

  /** Optional custom sitemap URLs
   *
   * Allows specifying exact sitemap locations instead of auto-discovery.
   * The crawler will:
   * 1. Skip the default sitemap discovery process
   * 2. Directly fetch and parse the provided sitemap URLs
   * 3. Extract and queue all URLs found in these sitemaps
   *
   * Example:
   * ```ts
   * sitemap_urls: [
   *   "https://example.com/custom-sitemap.xml",
   *   "https://example.com/playground-sitemap.xml"
   * ]
   * ```
   *
   * If provided URLs are invalid or unreachable, the crawler will fall back to using start_urls.
   *
   * @default null
   */
  sitemap_urls?: string[] | null

  /** Performance Configuration */

  /** Maximum number of concurrent requests
   *
   * Allow to rate limit the crawler by limiting the number of concurrent requests.
   * The crawler will start slowly to crawl the site, and increase the concurrency until it reaches the limit.
   *
   * @default Infinity
   */
  max_concurrency?: number | null

  /** Maximum requests per minute rate limit
   *
   * This controls how many total requests can be made per minute. It counts the amount of requests done every second, to ensure there is not a burst of requests at the `maxConcurrency` limit followed by a long period of waiting. By default, it is set to `Infinity` which means the crawler will keep going up to the `maxConcurrency`. We would set this if we wanted our crawler to work at full throughput, but also not keep hitting the website we're crawling with non-stop requests.
   * @default Infinity
   */
  max_requests_per_minute?: number | null

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
  batch_size?: number | null

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
  primary_key?: string | null

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
  meilisearch_settings?: Settings | null

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
   * @default null
   */
  additional_request_headers?: Record<string, string> | null

  /** Custom User-Agent strings to rotate through
   * Used to send a custom user agent to Meilisearch.
   *
   * @default []
   */
  user_agents?: string[]

  /** Custom Puppeteer instance
   * Not useful for most users, but can be used to pass custom options to the Puppeteer instance.
   * @default null
   */
  launch_options?: Record<string, any> | null

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
  webhook_url?: string | null

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
  webhook_payload?: Record<string, any> | null

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
   * @default null
   */
  not_found_selectors?: string[] | null

  /** Whether to keep existing Meilisearch index settings
   *
   * When true and the primary index already exists, the crawler will keep
   * the existing index settings instead of applying new ones.
   * When false or the index doesn't exist, new settings will be applied.
   *
   * @default true
   */
  keep_settings?: boolean | null
}

export type Scraper = {
  get: (url: string, $: CheerioAPI) => Promise<void>
}

export type DocumentType = BlockDocument | FullPageDocument

export type HTag = 'H1' | 'H2' | 'H3' | 'H4' | 'H5'

export type BlockDocument = {
  // Basic document fields
  url: string
  uid?: string
  parent_document_id?: string
  title?: string | null
  domain?: string | null
  urls_tags?: string[] | null
  page_block?: number | null
  anchor?: string | null

  // Content structure fields
  h1?: string | null
  h2?: string | null
  h3?: string | null
  h4?: string | null
  h5?: string | null
  h6?: string | null
  p?: string[] | string | null

  // Feature-specific fields
  meta?: Meta | null
  custom?: Record<string, string[] | string> | null
  markdown?: string | null
  schema?: Record<string, any> | null
  ai_extraction?: Record<string, any> | null
  ai_summary?: string | null
}

export type FullPageDocument = {
  uid?: string
  title?: string | null
  url: string
  domain?: string | null
  anchor?: string | null
  urls_tags?: string[] | null

  /// blocks of the page
  blocks: Array<{
    h1?: string | null
    h2?: string | null
    h3?: string | null
    h4?: string | null
    h5?: string | null
    h6?: string | null
    p?: string[] | string | null
    anchor?: string | null
  }>

  /// optional metadata from feature metadata
  metadata?: Record<string, string> | null

  /// optional custom selectors from feature custom_selectors
  custom?: Record<string, string[] | string> | null

  /// optional markdown from feature markdown
  markdown?: string | null

  /// optional pdfs from feature pdf
  // pdfs?: Array<{content?: string, metadata?: any}> | null;

  /// optional schema from feature schema
  schema?: Record<string, any> | null

  /// optional AI extraction results
  ai_extraction?: Record<string, any> | null

  /// optional AI summary
  ai_summary?: string | null
}

export type SchemaDocument = {
  uid: string
  [key: string]: any
}

export type Meta = {
  [name: string]: string
}
