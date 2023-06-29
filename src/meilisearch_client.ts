import { Config, MeiliSearch } from 'meilisearch'
import { version } from '../package.json'

export function initMeilisearchClient({ host, apiKey }: Config) {
  return new MeiliSearch({
    host,
    apiKey,
    clientAgents: [`Meilisearch Crawler (v${version})`],
  })
}
