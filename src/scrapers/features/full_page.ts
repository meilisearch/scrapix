import { CheerioAPI } from 'cheerio'
import { Config, FullPageDocument } from '../../types'
import { v4 as uuidv4 } from 'uuid'

export async function processFullPage(
  $: CheerioAPI,
  url: string,
  _config: Config
): Promise<FullPageDocument> {
  const title = $('title').text()
  const urls_tags = getUrlTags(url)
  const domain = new URL(url).hostname
  // Get all content elements
  let elems = $(
    'main h1, main h2, main h3, main h4, main h5, main h6, main p, main td, main li, main span'
  )
  if (elems.length === 0) {
    elems = $('h1, h2, h3, h4, h5, h6, p, td, li, span')
  }

  const blocks: FullPageDocument['blocks'] = []
  let currentBlock: FullPageDocument['blocks'][0] = {}

  for (const elem of elems.toArray()) {
    const tag = elem.tagName.toUpperCase()
    const text = cleanText($(elem).text())
    // const _id = ($(elem).attr('id') as string) || ''

    if (tag.startsWith('H')) {
      // If we have content in the current block, save it
      if (Object.keys(currentBlock).length > 0) {
        blocks.push(currentBlock)
        currentBlock = {}
      }

      // Update the current heading level
      const level = parseInt(tag[1])
      ;(currentBlock as any)[`h${level}`] = text

      // Clear lower level headings
      for (let i = level + 1; i <= 6; i++) {
        ;(currentBlock as any)[`h${i}`] = null
      }
    } else if (tag === 'P' || tag === 'TD' || tag === 'LI' || tag === 'SPAN') {
      if (!currentBlock.p) {
        currentBlock.p = []
      }
      if (
        text &&
        Array.isArray(currentBlock.p) &&
        !currentBlock.p.includes(text)
      ) {
        currentBlock.p.push(text)
      }
    }
  }

  // Add the last block if it has content
  if (Object.keys(currentBlock).length > 0) {
    blocks.push(currentBlock)
  }

  return {
    uid: uuidv4(),
    url,
    domain,
    title,
    urls_tags,
    blocks,
  }
}

function cleanText(text: string): string {
  return text
    .replace(/[\r\n]+/gm, ' ')
    .replace(/\s+/g, ' ')
    .replace('# ', '')
    .replace(/^\s+|\s+$/g, '')
}

function getUrlTags(url: string): string[] {
  return new URL(url).pathname.split('/').slice(1, -1)
}
