import { Config, BlockDocument, FullPageDocument } from '../types'
import { Sender } from '../sender'
import { processBlockSplit } from './features/block_split'
import { processMetadata } from './features/metadata'
import { processCustomSelectors } from './features/custom_selectors'
import { processMarkdown } from './features/markdown'
import { processSchema } from './features/schema'
import { processAIExtraction } from './features/ai_extraction'
import { processAISummary } from './features/ai_summary'
import { CheerioAPI } from 'cheerio'
import { processFullPage } from './features/full_page'
import * as minimatch from 'minimatch'

export class Scraper {
  private config: Config
  private sender: Sender

  constructor(sender: Sender, config: Config) {
    this.sender = sender
    this.config = config
  }

  async get(url: string, $: CheerioAPI): Promise<void> {
    const features = this.config.features || {}

    // Create initial document from full page
    let document: FullPageDocument = await processFullPage($, url, this.config)

    // Process other features in sequence
    if (this.shouldProcessFeature(features.metadata, url)) {
      document = await processMetadata($, document, this.config)
    }

    if (this.shouldProcessFeature(features.custom_selectors, url)) {
      document = await processCustomSelectors($, document, this.config)
    }

    if (this.shouldProcessFeature(features.markdown, url)) {
      document = await processMarkdown($, document, this.config)
    }

    if (this.shouldProcessFeature(features.schema, url)) {
      document = await processSchema($, document, this.config)
    }

    if (this.shouldProcessFeature(features.ai_extraction, url)) {
      document = await processAIExtraction($, document, this.config)
    }

    if (this.shouldProcessFeature(features.ai_summary, url)) {
      document = await processAISummary($, document, this.config)
    }

    // Finally, if block split is enabled, split the document into smaller blocks
    let documents: BlockDocument[] = []
    if (this.shouldProcessFeature(features.block_split, url)) {
      documents = await processBlockSplit($, document, this.config)
    } else {
      documents.push(document)
    }

    // Send all documents to Meilisearch
    for (const doc of documents) {
      await this.sender.add(doc)
    }
  }

  private shouldProcessFeature(feature: any, url: string): boolean {
    if (!feature?.activated) return false

    const includePages = feature.include_pages || ['**']
    const excludePages = feature.exclude_pages || []

    // Check if URL matches any include pattern
    const isIncluded = includePages.some((pattern: string) =>
      this.matchesPattern(url, pattern)
    )
    if (!isIncluded) return false

    // Check if URL matches any exclude pattern
    const isExcluded = excludePages.some((pattern: string) =>
      this.matchesPattern(url, pattern)
    )
    return !isExcluded
  }

  private matchesPattern(url: string, pattern: string): boolean {
    // Remove protocol for matching
    const cleanUrl = url.replace(/^https?:\/\//, '')
    return minimatch.minimatch(cleanUrl, pattern)
  }
}

export function createScraper(sender: Sender, config: Config) {
  return new Scraper(sender, config)
}
