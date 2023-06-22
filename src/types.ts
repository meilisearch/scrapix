import { Settings } from 'meilisearch'
import DocsearchScraper from './scrapers/docsearch'
import DefaultScraper from './scrapers/default'
import SchemaScraper from './scrapers/schema'

export type Config = {
  meilisearch_index_uid: string
  meilisearch_url: string
  meilisearch_api_key: string
  start_urls: string[]
  queue?: string[]
  primary_key?: string
  batch_size?: number
  custom_settings?: Settings
  strategy?: 'docsearch' | 'default' | 'schema'
  headless?: boolean
  exclude_crawled_urls?: string[]
  indexed_urls?: string[] // Overwrites start_urls if present
  exclude_indexed_urls?: string[]
  schema?: SchemaConfig
}

export type SchemaConfig = {
  convert_dates: boolean
  only_type: string
}

export type Scraper = DocsearchScraper | DefaultScraper | SchemaScraper

export type DocumentTypes = DocsSearchData | DefaultData | SchemaData

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
  [name: string]: string
}
