import { CheerioAPI } from 'cheerio'

/**
 * Clean HTML content by removing unnecessary attributes and elements
 * 
 * @param {CheerioAPI} $ - Cheerio instance with loaded HTML
 * @returns {string} Cleaned HTML string
 * 
 * @description
 * Removes styling, scripts, comments, and empty elements to produce
 * clean, semantic HTML suitable for content extraction and indexing.
 * 
 * Cleaning operations:
 * - Removes all class, id, and style attributes
 * - Removes script and style tags
 * - Removes HTML comments
 * - Removes empty elements
 * - Normalizes whitespace
 * 
 * @example
 * ```typescript
 * const $ = cheerio.load(htmlContent);
 * const cleaned = cleanHtml($);
 * ```
 */
export function cleanHtml($: CheerioAPI): string {
  // Remove all class attributes
  $('[class]').removeAttr('class')

  // Remove all id attributes
  $('[id]').removeAttr('id')

  // Remove all style attributes
  $('[style]').removeAttr('style')

  // Remove script and style tags
  $('script, style').remove()

  // Remove comments
  $('*')
    .contents()
    .filter(function () {
      return this.type === 'comment'
    })
    .remove()

  // Remove empty elements
  $('*').each((_, el) => {
    if ($(el).text().trim() === '' && !$(el).children().length) {
      $(el).remove()
    }
  })

  // Clean up whitespace
  $('*').each((_, el) => {
    const text = $(el).text().trim()
    if (text) {
      $(el).text(text)
    }
  })

  return $.html()
}
