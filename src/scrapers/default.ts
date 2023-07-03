import prettier from 'prettier'
import { v4 as uuidv4 } from 'uuid'
import { Sender } from '../sender.js'
import { Config, Meta, DefaultDocument } from '../types'
import { Page } from 'puppeteer'

export default class DefaultScraper {
  sender: Sender
  settings: Config['meilisearch_settings']

  constructor(sender: Sender, config: Config) {
    console.info('DefaultScraper::constructor')
    this.sender = sender
    this.settings = config.meilisearch_settings || {
      searchableAttributes: [
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'p',
        'title',
        'meta.description',
      ],
      filterableAttributes: ['urls_tags'],
      distinctAttribute: 'url',
    }
    void this.sender.updateSettings(this.settings)
  }

  async get(url: string, page: Page) {
    const title = await page.title()
    //get the meta of the page
    const meta = await this._extract_metadata_from_page(page)

    //for each page create dataset of consecutive h1, h2, h3, p. at each header after a paragraph, create a new dataset
    let data: DefaultDocument = {} as DefaultDocument
    let elems = await page.$$(
      'main h1, main h2, main h3, main h4, main h5, main h6, main p, main td, main li, main span'
    )
    if (elems.length === 0) {
      elems = await page.$$('h1, h2, h3, h4, h5, h6, p, td, li, span')
    }
    let page_block = 0
    for (let i = 0; i < elems.length; i++) {
      const elem = elems[i]
      const tag = await elem.evaluate((el) => el.tagName)
      let text = (await elem.evaluate((el) => el.textContent)) || ''
      text = this._clean_text(text)
      data.uid = uuidv4()
      data.url = url
      data.title = title
      data.meta = meta
      data.image_url = this._get_image_url_from_meta(meta)
      data.page_block = page_block
      const urls_tags = new URL(url).pathname.split('/')
      data.urls_tags = urls_tags.slice(1, urls_tags.length - 1)

      const id = await elem.evaluate((el) => el.id)
      if (tag === 'H1') {
        if (data['h1']) {
          await this._add_data(data)
          page_block++
          data = {} as DefaultDocument
        }
        data['h1'] = text
        data.anchor = '#' + id
      } else if (tag === 'H2') {
        if (data['h2']) {
          await this._add_data(data)
          page_block++
          data = { h1: data['h1'] } as DefaultDocument
        }
        data.anchor = '#' + id
        data['h2'] = text
      } else if (tag === 'H3') {
        if (data['h3']) {
          await this._add_data(data)
          page_block++
          data = { h1: data['h1'], h2: data['h2'] } as DefaultDocument
        }
        data.anchor = '#' + id
        data['h3'] = text
      } else if (tag === 'H4') {
        if (data['h4']) {
          await this._add_data(data)
          page_block++
          data = {
            h1: data['h1'],
            h2: data['h2'],
            h3: data['h3'],
          } as DefaultDocument
        }
        data.anchor = '#' + id
        data['h4'] = text
      } else if (tag === 'H5') {
        if (data['h5']) {
          await this._add_data(data)
          page_block++
          data = {
            h1: data['h1'],
            h2: data['h2'],
            h3: data['h3'],
            h4: data['h4'],
          } as DefaultDocument
        }
        data.anchor = '#' + id
        data['h5'] = text
      } else if (tag === 'H6') {
        if (data['h6']) {
          await this._add_data(data)
          page_block++
          data = {
            h1: data['h1'],
            h2: data['h2'],
            h3: data['h3'],
            h4: data['h4'],
            h5: data['h5'],
          } as DefaultDocument
        }
        data.anchor = '#' + id
        data['h6'] = text
      } else if (
        tag === 'P' ||
        tag === 'TD' ||
        tag === 'LI' ||
        tag === 'SPAN'
      ) {
        if (!data['p']) {
          data['p'] = []
        }
        // TODO: should we leave `null` values in the `p` array?
        if (text && Array.isArray(data['p']) && !data['p'].includes(text)) {
          data['p'].push(text)
        }
      }
      if (i === elems.length - 1) {
        await this._add_data(data)
      }
    }
  }

  async _add_data(data: DefaultDocument) {
    if (Array.isArray(data['p'])) {
      data['p'] = data['p'].join('\n')
    }
    await this.sender.add(data)
  }

  // Remove from a text all multiple spaces, new lines, and leading and trailing spaces, and
  // remove '# ' from the beginning of the text
  _clean_text(text: string) {
    text = text.replace(/[\r\n]+/gm, ' ')
    ///remove multiple spaces
    text = text.replace(/\s+/g, ' ')
    ///remove '# '
    text = text.replace('# ', '')
    /// Trim leading and trailing spaces
    text = text.replace(/^\s+|\s+$/g, '')
    return text
  }

  // Extract the meta of a page
  async _extract_metadata_from_page(page: Page) {
    return await page.evaluate(() => {
      const metas = document.getElementsByTagName('meta')
      const meta: Meta = {} as Meta
      for (let i = 0; i < metas.length; i++) {
        const name = metas[i].getAttribute('name')
        const content = metas[i].getAttribute('content')
        if (name && content) {
          meta[name] = content
        }
      }
      return meta
    })
  }

  // Extract the image url from the meta of a page
  _get_image_url_from_meta(meta: Meta) {
    if (meta['og:image']) {
      return meta['og:image']
    } else if (meta['twitter:image']) {
      return meta['twitter:image']
    } else if (meta['image']) {
      return meta['image']
    }
    return
  }

  // A function that retro-engineer the hljs generated html to extract the code
  async _extract_code_from_page(page: Page) {
    const code = await page.evaluate(() => {
      let code = ''
      const pre = document.getElementsByTagName('pre')
      for (let i = 0; i < pre.length; i++) {
        const code_elem = pre[i].getElementsByTagName('code')
        if (code_elem.length > 0) {
          code += code_elem[0].innerText
        }
      }
      return code
    })
    return this._format_code(code)
  }
  // A function that use prettier to format the code that has been extracted in a html page.
  // Format only if the language is supported by prettier
  _format_code(code: string) {
    let formatted_code = ''
    try {
      formatted_code = prettier.format(code, {
        parser: 'babel',
      })
    } catch (e) {
      console.log('Error while formatting code', e)
      return code
    }
    return formatted_code
  }
}
