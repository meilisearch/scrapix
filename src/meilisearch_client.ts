import { Config, MeiliSearch } from 'meilisearch'

export function initMeilisearchClient({
  host,
  apiKey,
  clientAgents = [],
}: Config) {
  return new MeiliSearch({
    host,
    apiKey,
    clientAgents: [
      `Meilisearch Crawler (v${process.env.npm_package_version})`,
      ...clientAgents,
    ],
  })
}
