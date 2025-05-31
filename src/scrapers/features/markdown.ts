import { CheerioAPI } from 'cheerio'
import { Config, FullPageDocument } from '../../types'
import { NodeHtmlMarkdown } from 'node-html-markdown'

export async function processMarkdown(
  $: CheerioAPI,
  document: FullPageDocument,
  config: Config
): Promise<FullPageDocument> {
  if (
    !config.features ||
    !config.features.markdown ||
    !config.features.markdown.activated
  ) {
    return document
  }

  // Get main content area, fallback to body if no main element found
  const mainContent = $('main').length ? $('main') : $('body')

  // Configure NodeHtmlMarkdown with enhanced options
  const nhm = new NodeHtmlMarkdown({
    // textReplace: [
    //   // Remove any remaining links
    //   [/\[([^\]]+)\]\([^)]+\)/g, '$1'],
    //   // Remove image tags and their content
    //   [/!\[[^\]]*\]\([^)]+\)/g, ''],
    //   // Remove empty lines
    //   [/^\s*[\r\n]/gm, ''],
    //   // Remove multiple consecutive empty lines
    //   [/\n\s*\n\s*\n/g, '\n\n'],
    // ],
    ignore: ['a', 'img'],
  })

  // Convert HTML to Markdown
  const markdown = nhm.translate(mainContent.html() || '')

  return {
    ...document,
    markdown,
  }
}
