import { CheerioAPI } from 'cheerio'
import { Config, BlockDocument } from '../../types'
import { v4 as uuidv4 } from 'uuid'

export async function processBlockSplit(
  $: CheerioAPI,
  documents: BlockDocument[],
  config: Config
): Promise<BlockDocument[]> {
  if (
    !config.features ||
    !config.features.block_split ||
    !config.features.block_split.activated
  ) {
    return documents
  }

  const title = $('title').text()
  const meta = extractMetaData($)
  const image_url = getImageUrl($)
  const urls_tags = getUrlTags(documents[0].url)

  let currentDocument: Partial<BlockDocument> = {
    uid: uuidv4(),
    url: documents[0].url,
    title,
    meta,
    image_url,
    urls_tags,
    page_block: 0,
    p: [],
    anchor: '',
  }

  // Get all content elements
  let elems = $(
    'main h1, main h2, main h3, main h4, main h5, main h6, main p, main td, main li, main span'
  )
  if (elems.length === 0) {
    elems = $('h1, h2, h3, h4, h5, h6, p, td, li, span')
  }

  const newDocuments: BlockDocument[] = []

  for (const elem of elems.toArray()) {
    const tag = elem.tagName.toUpperCase()
    const text = cleanText($(elem).text())
    const id = ($(elem).attr('id') as string) || ''

    if (tag.startsWith('H')) {
      // If we have content in the current document, save it
      if (currentDocument.p && currentDocument.p.length > 0) {
        newDocuments.push(currentDocument as BlockDocument)
        currentDocument.page_block = (currentDocument.page_block || 0) + 1
        currentDocument = { ...currentDocument, uid: uuidv4(), p: [] }
      }

      // Update the current heading level
      const level = parseInt(tag[1])
      ;(currentDocument as any)[`h${level}`] = text
      currentDocument.anchor = `#${id}`

      // Clear lower level headings
      for (let i = level + 1; i <= 6; i++) {
        ;(currentDocument as any)[`h${i}`] = undefined
      }
    } else if (tag === 'P' || tag === 'TD' || tag === 'LI' || tag === 'SPAN') {
      if (!currentDocument.p) {
        currentDocument.p = []
      }
      if (
        text &&
        Array.isArray(currentDocument.p) &&
        !currentDocument.p.includes(text)
      ) {
        currentDocument.p.push(text)
      }
    }
  }

  // Add the last document if it has content
  if (currentDocument.p && currentDocument.p.length > 0) {
    newDocuments.push(currentDocument as BlockDocument)
  }

  return newDocuments
}

function cleanText(text: string): string {
  return text
    .replace(/[\r\n]+/gm, ' ')
    .replace(/\s+/g, ' ')
    .replace('# ', '')
    .replace(/^\s+|\s+$/g, '')
}

function extractMetaData($: CheerioAPI): Record<string, string> {
  const meta: Record<string, string> = {}
  $('meta').each((_, element) => {
    const name = $(element).attr('name')
    const content = $(element).attr('content')
    if (name && content) {
      meta[name] = content
    }
  })
  return meta
}

function getImageUrl($: CheerioAPI): string | undefined {
  const meta = extractMetaData($)
  return meta['og:image'] || meta['twitter:image'] || meta['image']
}

function getUrlTags(url: string): string[] {
  return new URL(url).pathname.split('/').slice(1, -1)
}
