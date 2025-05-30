import { CheerioAPI } from 'cheerio'
import { Config, FullPageDocument } from '../../types'

export async function processCustomSelectors(
  $: CheerioAPI,
  document: FullPageDocument,
  config: Config
): Promise<FullPageDocument> {
  if (!config.features?.custom_selectors?.activated) {
    return document
  }

  const custom: Record<string, string[] | string> = {}

  // Process each custom selector
  for (const [key, selector] of Object.entries(
    config.features?.custom_selectors?.selectors || {}
  )) {
    const values: string[] = []

    // Handle both string and string[] selector types
    if (Array.isArray(selector)) {
      // If selector is an array, process each selector and combine results
      for (const sel of selector) {
        const elements = $(sel)
        elements.each((_, element) => {
          const text = $(element).text().trim()
          if (text) {
            values.push(text)
          }
        })
      }
    } else {
      // If selector is a string, process it directly
      const elements = $(selector)
      elements.each((_, element) => {
        const text = $(element).text().trim()
        if (text) {
          values.push(text)
        }
      })
    }

    if (values.length > 0) {
      if (values.length === 1) {
        custom[key] = values[0]
      } else {
        custom[key] = values
      }
    }
  }

  // Merge custom data with document
  return {
    ...document,
    custom,
  }
}
