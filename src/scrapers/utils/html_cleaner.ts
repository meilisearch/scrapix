import { CheerioAPI } from 'cheerio'

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
