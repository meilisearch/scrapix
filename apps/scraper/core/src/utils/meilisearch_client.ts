import { Config, MeiliSearch } from 'meilisearch'
import { PACKAGE_VERSION } from './package_version'

/**
 * Initialize a Meilisearch client with custom user agents
 * 
 * @param {Config} config - Meilisearch client configuration
 * @param {string} config.host - The Meilisearch server URL
 * @param {string} config.apiKey - The API key for authentication
 * @param {string[]} config.clientAgents - Additional client agents to include
 * @returns {MeiliSearch} Configured Meilisearch client instance
 * 
 * @example
 * ```typescript
 * const client = initMeilisearchClient({
 *   host: 'http://localhost:7700',
 *   apiKey: 'masterKey',
 *   clientAgents: ['MyApp/1.0']
 * });
 * ```
 */
export function initMeilisearchClient({
  host,
  apiKey,
  clientAgents = [],
}: Config) {
  return new MeiliSearch({
    host,
    apiKey,
    clientAgents: [
      `Meilisearch Crawler (v${PACKAGE_VERSION})`,
      ...clientAgents,
    ],
  })
}
