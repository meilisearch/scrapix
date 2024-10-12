import { Config, MeiliSearch } from "meilisearch";
import { PACKAGE_VERSION } from "./package_version";

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
  });
}
