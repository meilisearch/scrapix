/**
 * HTTP client with connection pooling for better performance
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import https from 'https'
import http from 'http'
import { getConfig } from '../constants'

/**
 * Create an HTTP agent with connection pooling
 */
function createPooledAgent(isHttps: boolean) {
  const options = {
    keepAlive: true,
    keepAliveMsecs: getConfig('HTTP', 'KEEP_ALIVE_MS'),
    maxSockets: getConfig('HTTP', 'MAX_SOCKETS_PER_HOST'),
    maxFreeSockets: getConfig('HTTP', 'MAX_FREE_SOCKETS'),
  }

  return isHttps ? new https.Agent(options) : new http.Agent(options)
}

// Singleton agents for connection pooling
const httpAgent = createPooledAgent(false)
const httpsAgent = createPooledAgent(true)

/**
 * Create an Axios instance with connection pooling
 * 
 * @param {AxiosRequestConfig} config - Axios configuration
 * @returns {AxiosInstance} Configured Axios instance with connection pooling
 * 
 * @example
 * ```typescript
 * const client = createPooledHttpClient({
 *   baseURL: 'https://api.example.com',
 *   timeout: 30000
 * });
 * ```
 */
export function createPooledHttpClient(config?: AxiosRequestConfig): AxiosInstance {
  return axios.create({
    ...config,
    httpAgent,
    httpsAgent,
    // Set reasonable defaults
    timeout: config?.timeout || getConfig('HTTP', 'DEFAULT_TIMEOUT'),
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  })
}

/**
 * Global pooled HTTP client for general use
 */
export const pooledHttpClient = createPooledHttpClient()

/**
 * Meilisearch-specific pooled HTTP client
 */
export const meilisearchHttpClient = createPooledHttpClient({
  headers: {
    'User-Agent': 'Scrapix/1.0 (Meilisearch Client)',
  },
})

/**
 * OpenAI-specific pooled HTTP client
 */
export const openaiHttpClient = createPooledHttpClient({
  baseURL: 'https://api.openai.com/v1',
  timeout: 60000, // 60 seconds for AI operations
  headers: {
    'User-Agent': 'Scrapix/1.0 (OpenAI Client)',
  },
})

/**
 * Clean up connection pools (for graceful shutdown)
 */
export function closeConnectionPools(): void {
  httpAgent.destroy()
  httpsAgent.destroy()
}