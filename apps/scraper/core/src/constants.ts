/**
 * Configuration constants for the Scrapix crawler
 * These values can be overridden via environment variables
 */

export const CRAWLER_CONSTANTS = {
  // AI Feature Configuration
  AI: {
    /** Maximum length of content to send to AI models (in characters) */
    MAX_CONTENT_LENGTH: parseInt(process.env.SCRAPIX_AI_MAX_CONTENT_LENGTH || '4000', 10),
    
    /** Default AI model for extraction */
    DEFAULT_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    
    /** Temperature for AI responses */
    EXTRACTION_TEMPERATURE: parseFloat(process.env.SCRAPIX_AI_EXTRACTION_TEMP || '0.1'),
    SUMMARY_TEMPERATURE: parseFloat(process.env.SCRAPIX_AI_SUMMARY_TEMP || '0.3'),
    
    /** Maximum tokens for AI summary */
    SUMMARY_MAX_TOKENS: parseInt(process.env.SCRAPIX_AI_SUMMARY_MAX_TOKENS || '150', 10),
    
    /** Request timeout for AI API calls (ms) */
    REQUEST_TIMEOUT: parseInt(process.env.SCRAPIX_AI_REQUEST_TIMEOUT || '30000', 10),
  },

  // Meilisearch Configuration
  MEILISEARCH: {
    /** Default batch size for document indexing */
    DEFAULT_BATCH_SIZE: parseInt(process.env.SCRAPIX_BATCH_SIZE || '1000', 10),
    
    /** Timeout for waiting on Meilisearch tasks (ms) */
    TASK_WAIT_TIMEOUT: parseInt(process.env.SCRAPIX_TASK_WAIT_TIMEOUT || '15000', 10),
    
    /** Extended timeout for finish operations (ms) */
    TASK_WAIT_TIMEOUT_EXTENDED: parseInt(process.env.SCRAPIX_TASK_WAIT_TIMEOUT_EXTENDED || '30000', 10),
    
    /** Timeout for initial index creation (ms) */
    INDEX_CREATE_TIMEOUT: parseInt(process.env.SCRAPIX_INDEX_CREATE_TIMEOUT || '5000', 10),
  },

  // Retry Configuration
  RETRY: {
    /** Maximum number of retry attempts */
    MAX_ATTEMPTS: parseInt(process.env.SCRAPIX_RETRY_MAX_ATTEMPTS || '3', 10),
    
    /** Base delay for exponential backoff (ms) */
    BASE_DELAY: parseInt(process.env.SCRAPIX_RETRY_BASE_DELAY || '1000', 10),
    
    /** Maximum delay between retries (ms) */
    MAX_DELAY: parseInt(process.env.SCRAPIX_RETRY_MAX_DELAY || '10000', 10),
  },

  // Webhook Configuration
  WEBHOOK: {
    /** Default interval for webhook status updates (ms) */
    DEFAULT_INTERVAL: parseInt(process.env.WEBHOOK_INTERVAL || '5000', 10),
  },

  // Rate Limiting Configuration
  RATE_LIMIT: {
    /** Window duration for rate limiting (ms) */
    WINDOW_MS: parseInt(process.env.SCRAPIX_RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
    
    /** Maximum requests per window for crawl endpoints */
    CRAWL_MAX_REQUESTS: parseInt(process.env.SCRAPIX_RATE_LIMIT_CRAWL || '100', 10),
    
    /** Maximum requests per window for status endpoints */
    STATUS_MAX_REQUESTS: parseInt(process.env.SCRAPIX_RATE_LIMIT_STATUS || '60', 10),
    
    /** Maximum requests per window globally */
    GLOBAL_MAX_REQUESTS: parseInt(process.env.SCRAPIX_RATE_LIMIT_GLOBAL || '1000', 10),
  },

  // Crawler Configuration
  CRAWLER: {
    /** Default concurrency for crawling */
    DEFAULT_CONCURRENCY: parseInt(process.env.SCRAPIX_DEFAULT_CONCURRENCY || '10', 10),
    
    /** Default requests per minute limit */
    DEFAULT_REQUESTS_PER_MINUTE: parseInt(process.env.SCRAPIX_DEFAULT_RPM || '100', 10),
  },

  // Server Configuration
  SERVER: {
    /** Default server port */
    DEFAULT_PORT: parseInt(process.env.PORT || '8080', 10),
    
    /** Maximum request body size */
    MAX_BODY_SIZE: process.env.SCRAPIX_MAX_BODY_SIZE || '10mb',
  },

  // Proxy Server Configuration
  PROXY: {
    /** Default proxy port */
    DEFAULT_PORT: parseInt(process.env.PROXY_PORT || '8080', 10),
    
    /** Default management port */
    MANAGEMENT_PORT: parseInt(process.env.PORT || '3000', 10),
    
    /** Maximum logs to keep in memory */
    MAX_LOGS: parseInt(process.env.SCRAPIX_PROXY_MAX_LOGS || '1000', 10),
    
    /** Request timeout (ms) */
    REQUEST_TIMEOUT: parseInt(process.env.SCRAPIX_PROXY_TIMEOUT || '30000', 10),
  },

  // HTTP Client Configuration (for connection pooling)
  HTTP: {
    /** Keep-alive timeout for persistent connections (ms) */
    KEEP_ALIVE_MS: parseInt(process.env.SCRAPIX_HTTP_KEEP_ALIVE_MS || '1000', 10),
    
    /** Maximum sockets per host */
    MAX_SOCKETS_PER_HOST: parseInt(process.env.SCRAPIX_HTTP_MAX_SOCKETS || '256', 10),
    
    /** Maximum free sockets to keep around */
    MAX_FREE_SOCKETS: parseInt(process.env.SCRAPIX_HTTP_MAX_FREE_SOCKETS || '256', 10),
    
    /** Default request timeout (ms) */
    DEFAULT_TIMEOUT: parseInt(process.env.SCRAPIX_HTTP_TIMEOUT || '30000', 10),
  },
} as const

/**
 * Get a nested configuration value with type safety
 */
export function getConfig<T extends keyof typeof CRAWLER_CONSTANTS>(
  category: T
): typeof CRAWLER_CONSTANTS[T]

export function getConfig<
  T extends keyof typeof CRAWLER_CONSTANTS,
  K extends keyof typeof CRAWLER_CONSTANTS[T]
>(
  category: T,
  key: K
): typeof CRAWLER_CONSTANTS[T][K]

export function getConfig<
  T extends keyof typeof CRAWLER_CONSTANTS,
  K extends keyof typeof CRAWLER_CONSTANTS[T]
>(category: T, key?: K) {
  if (key === undefined) {
    return CRAWLER_CONSTANTS[category]
  }
  return CRAWLER_CONSTANTS[category][key]
}