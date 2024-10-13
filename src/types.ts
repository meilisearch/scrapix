import { Settings } from "meilisearch";
import { PuppeteerNode } from "puppeteer-core";
import { CheerioAPI } from "cheerio";

export type CrawlerType = "cheerio" | "puppeteer" | "playwright";

export type Config = {
  meilisearch_index_uid: string;
  meilisearch_url: string;
  meilisearch_api_key: string;
  start_urls: string[];
  urls_to_exclude?: string[];
  additional_request_headers?: Record<string, string>;
  queue?: string[];
  primary_key?: string;
  batch_size?: number;
  meilisearch_settings?: Settings;
  strategy?: "docssearch" | "default" | "schema" | "markdown" | "custom";
  headless?: boolean;
  urls_to_index?: string[]; // Overwrites start_urls if present
  urls_to_not_index?: string[];
  schema_settings?: SchemaSettings;
  user_agents?: string[];
  webhook_payload?: Record<string, any>;
  webhook_url?: string;
  crawler_type: CrawlerType;
  launch_options?: Record<string, any>;
  launcher?: PuppeteerNode;
  selectors?: Record<string, string>;
};

export type SchemaSettings = {
  convert_dates: boolean;
  only_type: string;
};

export type ScraperType = "default" | "docssearch" | "schema";

export type Scraper = {
  get: (url: string, $: CheerioAPI) => Promise<void>;
};

export type DocumentType =
  | DocsSearchDocument
  | DefaultDocument
  | SchemaDocument;

export type HierarchyLevel = {
  hierarchy_lvl0: string | null;
  hierarchy_lvl1: string | null;
  hierarchy_lvl2: string | null;
  hierarchy_lvl3: string | null;
  hierarchy_lvl4: string | null;
  hierarchy_lvl5: string | null;
};

export type RadioHierarchyLevel = {
  hierarchy_radio_lvl0: string | null;
  hierarchy_radio_lvl1: string | null;
  hierarchy_radio_lvl2: string | null;
  hierarchy_radio_lvl3: string | null;
  hierarchy_radio_lvl4: string | null;
  hierarchy_radio_lvl5: string | null;
};

export type HTag = "H1" | "H2" | "H3" | "H4" | "H5";

export type DocsSearchDocument = HierarchyLevel &
  RadioHierarchyLevel & {
    url: string;
    uid?: string;
    anchor: string;
    content?: string[] | string;
    level: number;
    type: "lvl0" | "lvl1" | "lvl2" | "lvl3" | "lvl4" | "lvl5" | "content";
  };

export type DefaultDocument = {
  url: string;
  uid?: string;
  anchor: string;
  title: string;
  meta: Meta;
  image_url?: string;
  page_block: number;
  urls_tags: string[];
  h1?: string | null;
  h2?: string | null;
  h3?: string | null;
  h4?: string | null;
  h5?: string | null;
  h6?: string | null;
  p: string[] | string;
};

export type SchemaDocument = {
  uid: string;
  [key: string]: any;
};

export type Meta = {
  [name: string]: string;
};

export type MarkdownDocument = {
  uid: string;
  url: string;
  title: string;
  description: string;
  content: string;
  urls_tags: string[];
  meta?: Meta;
};

export type CustomDocument = {
  uid: string;
  [key: string]: any;
};
