import { CheerioAPI } from 'cheerio'
import { Config, FullPageDocument } from '../../types'

export async function processMetadata(
  $: CheerioAPI,
  document: FullPageDocument,
  config: Config
): Promise<FullPageDocument> {
  if (
    !config.features ||
    !config.features.metadata ||
    !config.features.metadata.activated
  ) {
    return document
  }

  // Extract meta tags
  const metadata: Record<string, string> = {}

  // Extract meta tags
  $('meta').each((_, element) => {
    const name = $(element).attr('name') || $(element).attr('property')
    const content = $(element).attr('content')
    if (name && content) {
      metadata[name] = content
    }
  })

  // Extract OpenGraph tags
  $("meta[property^='og:']").each((_, element) => {
    const property = $(element).attr('property')
    const content = $(element).attr('content')
    if (property && content) {
      metadata[property] = content
    }
  })

  // Extract Twitter card tags
  $("meta[name^='twitter:']").each((_, element) => {
    const name = $(element).attr('name')
    const content = $(element).attr('content')
    if (name && content) {
      metadata[name] = content
    }
  })

  return {
    ...document,
    metadata: metadata,
  }
}
