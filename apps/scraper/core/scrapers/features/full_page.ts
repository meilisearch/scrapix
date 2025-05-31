import { CheerioAPI } from 'cheerio'
import { Config, FullPageDocument } from '../../types'
import { v4 as uuidv4 } from 'uuid'

type Block = FullPageDocument['blocks'][0]

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

  const blocks: Block[] = []
  let currentBlock: Block = {}

  for (const elem of elems.toArray()) {
    const tag = elem.tagName.toUpperCase()
    const text = cleanText($(elem).text())
    const id = $(elem).attr('id') || ''

    if (tag === 'H1') {
      if (Object.keys(currentBlock).length > 0) {
        blocks.push(currentBlock)
        currentBlock = {}
      }
      currentBlock.h1 = text
      currentBlock.anchor = id ? `#${id}` : null
      currentBlock.h2 = null
      currentBlock.h3 = null
      currentBlock.h4 = null
      currentBlock.h5 = null
      currentBlock.h6 = null
    } else if (tag === 'H2') {
      if (Object.keys(currentBlock).length > 0) {
        blocks.push(currentBlock)
        currentBlock = { h1: currentBlock.h1 }
      }
      currentBlock.h2 = text
      currentBlock.anchor = id ? `#${id}` : null
      currentBlock.h3 = null
      currentBlock.h4 = null
      currentBlock.h5 = null
      currentBlock.h6 = null
    } else if (tag === 'H3') {
      if (Object.keys(currentBlock).length > 0) {
        blocks.push(currentBlock)
        currentBlock = {
          h1: currentBlock.h1,
          h2: currentBlock.h2,
        }
      }
      currentBlock.h3 = text
      currentBlock.anchor = id ? `#${id}` : null
      currentBlock.h4 = null
      currentBlock.h5 = null
      currentBlock.h6 = null
    } else if (tag === 'H4') {
      if (Object.keys(currentBlock).length > 0) {
        blocks.push(currentBlock)
        currentBlock = {
          h1: currentBlock.h1,
          h2: currentBlock.h2,
          h3: currentBlock.h3,
        }
      }
      currentBlock.h4 = text
      currentBlock.anchor = id ? `#${id}` : null
      currentBlock.h5 = null
      currentBlock.h6 = null
    } else if (tag === 'H5') {
      if (Object.keys(currentBlock).length > 0) {
        blocks.push(currentBlock)
        currentBlock = {
          h1: currentBlock.h1,
          h2: currentBlock.h2,
          h3: currentBlock.h3,
          h4: currentBlock.h4,
        }
      }
      currentBlock.h5 = text
      currentBlock.anchor = id ? `#${id}` : null
      currentBlock.h6 = null
    } else if (tag === 'H6') {
      if (Object.keys(currentBlock).length > 0) {
        blocks.push(currentBlock)
        currentBlock = {
          h1: currentBlock.h1,
          h2: currentBlock.h2,
          h3: currentBlock.h3,
          h4: currentBlock.h4,
          h5: currentBlock.h5,
        }
      }
      currentBlock.h6 = text
      currentBlock.anchor = id ? `#${id}` : null
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

  // Convert p arrays to strings in the final blocks
  const processedBlocks = blocks.map((block) => {
    if (Array.isArray(block.p)) {
      return {
        ...block,
        p: block.p.join('\n'),
      } as Block
    }
    return block
  })

  return {
    uid: uuidv4(),
    url,
    domain,
    title,
    urls_tags,
    blocks: processedBlocks,
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
