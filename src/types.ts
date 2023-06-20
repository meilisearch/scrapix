import { Settings } from "meilisearch";
import DocsearchScraper from "./scrapers/docsearch";
import DefaultScraper from "./scrapers/default";
import CustomScraper from "./scrapers/custom";
import SchemaScraper from "./scrapers/schema";

// TODO: find out which are mandatory or not
export type Config = {
  meilisearch_index_name: string // TODO: rename to meilisearch_index_uid ?
  meilisearch_host: string // TODO: rename to meilisearch_url
  meilisearch_api_key: string
  crawled_urls: string[] // TODO: rename to start_urls, as it is conventional
  custom_crawler: string // TODO: Remove
  queue?: string[]
  primary_key?: string
  batch_size?: number
  custom_settings?: Settings // TODO: rename to meilisearch_settings
  strategy?: 'docsearch' | 'default' | 'custom' | 'schema' // TODO: rename docsearch to docssearch
  headless?: boolean // TODO: rename to wait_js ?
  exclude_crawled_urls?: string[] // TODO: rename to `ignored_urls` ?
  indexed_urls?: string[] // TODO: Rename, not sure what it does
  exclude_indexed_urls?: string[] // TODO: rename
  schema?: SchemaConfig
  
}

export type SchemaConfig = {
  convert_dates: boolean
  only_type: string
}

export type Scraper = DocsearchScraper | DefaultScraper | CustomScraper | SchemaScraper

export type DocsSearchData = {
  url: string
  uid?: string
  anchor: string
  hierarchy_lvl0: string | null
  hierarchy_lvl1: string | null
  hierarchy_lvl2: string | null
  hierarchy_lvl3: string | null
  hierarchy_lvl4: string | null
  hierarchy_lvl5: string | null
  content: string[]
  hierarchy_radio_lvl0: string | null
  hierarchy_radio_lvl1: string | null
  hierarchy_radio_lvl2: string | null
  hierarchy_radio_lvl3: string | null
  hierarchy_radio_lvl4: string | null
  hierarchy_radio_lvl5: string | null
  
}

export type DefaultData = {
  url: string
  uid?: string
  anchor: string
  title: string
  meta: Meta
  image_url?: string
  page_block: number
  urls_tags: string[]
  h1?: string | null
  h2?: string | null
  h3?: string | null
  h4?: string | null
  h5?: string | null
  h6?: string | null
  p: string[]
}

export type SchemaData = {
  uid: string
  [key: string]: any
  
}

export type Meta = {
  [name: string]: string;
}
