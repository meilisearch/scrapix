import { CheerioAPI } from 'cheerio'
import { Config, BlockDocument, FullPageDocument } from '../../types'
import { v4 as uuidv4 } from 'uuid'

export async function processBlockSplit(
  _$: CheerioAPI,
  document: FullPageDocument,
  config: Config
): Promise<BlockDocument[]> {
  if (
    !config.features ||
    !config.features.block_split ||
    !config.features.block_split.activated
  ) {
    return [document]
  }

  // Create a parent document ID that will be shared across all blocks
  const parentDocumentId = document.uid || uuidv4()
  const sharedMetadata = {
    // Basic document metadata
    title: document.title,
    url: document.url,
    domain: document.domain,
    urls_tags: document.urls_tags,
    // Feature-specific metadata
    meta: document.metadata,
    custom: document.custom,
    markdown: document.markdown,
    schema: document.schema,
    ai_extraction: document.ai_extraction,
    ai_summary: document.ai_summary,
  }

  const newDocuments: BlockDocument[] = []

  // Process each block from the full page document
  for (const block of document.blocks) {
    const blockDocument: BlockDocument = {
      uid: uuidv4(),
      parent_document_id: parentDocumentId,
      page_block: newDocuments.length,
      ...sharedMetadata,
      ...block,
    }
    newDocuments.push(blockDocument)
  }

  return newDocuments
}
