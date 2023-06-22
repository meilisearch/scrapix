import { Settings } from 'meilisearch'
import DocsearchScraper from './scrapers/docssearch'
import DefaultScraper from './scrapers/default'
import SchemaScraper from './scrapers/schema'

export type Config = {
  meilisearch_index_uid: string
  meilisearch_url: string
  meilisearch_api_key: string
  start_urls: string[]
  urls_to_exclude?: string[]
  queue?: string[]
  primary_key?: string
  batch_size?: number
  meilisearch_settings?: Settings
  strategy?: 'docssearch' | 'default' | 'schema'
  headless?: boolean
  urls_to_index?: string[] // Overwrites start_urls if present
  urls_to_not_index?: string[]
  schema_settings?: SchemaSettings
}

export type SchemaSettings = {
  convert_dates: boolean
  only_type: string
}

export type Scraper = DocsearchScraper | DefaultScraper | SchemaScraper

export type DocumentType = DocsSearchDocument | DefaultDocument | SchemaDocument

export type DocsSearchDocument = {
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

export type DefaultDocument = {
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

export type SchemaDocument = {
  uid: string
  [key: string]: any
}

export type Meta = {
  [name: string]: string
}
