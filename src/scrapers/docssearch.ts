import { v4 as uuidv4 } from 'uuid'
import { Sender } from '../sender'
import { Page } from 'puppeteer'
import { DocsSearchDocument } from '../types'

export default class DocsearchScaper {
  sender: Sender
  counter: number //TODO: temporary counter to see how many documents are being added

  constructor(sender: Sender) {
    console.info('DocsearchScaper::constructor')
    this.sender = sender
    this.counter = 0
    void this.sender.updateSettings({
      searchableAttributes: [
        'hierarchy_lvl0',
        'hierarchy_lvl1',
        'hierarchy_lvl2',
        'hierarchy_lvl3',
        'hierarchy_lvl4',
        'hierarchy_lvl5',
        'content',
      ],
    })
  }

  _amount_of_hierarchies(pageMap: DocsSearchDocument) {
    return Object.keys(pageMap).filter((key) => key.startsWith('hierarchy_lvl'))
      .length
  }
  _is_h_tag(tag: string) {
    return tag.startsWith('H')
  }

  _remove_lower_hierarchies(
    pageMap: DocsSearchDocument,
    currentLevel: string
  ): DocsSearchDocument {
    for (const hierarchy in pageMap) {
      const levelMatch = hierarchy.match(/\d+/) || []
      const currentLevelMatch = currentLevel.match(/\d+/) || []
      if (levelMatch[0] && currentLevelMatch[0]) {
        if (parseInt(levelMatch[0]) > parseInt(currentLevelMatch[0])) {
          delete pageMap[hierarchy as keyof DocsSearchDocument]
        }
      }
    }
    return pageMap
  }

  async get(url: string, page: Page) {
    //for each page create dataset of consecutive h1, h2, h3, p. at each header after a paragraph, create a new dataset
    let elems = await page.$$(
      'main h1, main h2, main h3, main h4, main h5, main p, main td, main li, main span'
    )
    if (elems.length === 0) {
      elems = await page.$$('h1, h2, h3, h4, h5, p, td, li, span')
    }
    let document = {} as DocsSearchDocument
    for (let i = 0; i < elems.length; i++) {
      const elem = elems[i]
      const tag = await elem.evaluate((el) => el.tagName)
      let text = (await elem.evaluate((el) => el.textContent)) || ''
      text = this._clean_text(text)

      const urls_tags = new URL(url).pathname.split('/')
      const only_urls_tags = urls_tags.slice(1, urls_tags.length - 1)
      document['hierarchy_lvl0'] = only_urls_tags.join(' / ')
      document['url'] = url

      if (
        this._is_h_tag(tag) &&
        this._amount_of_hierarchies(document) > 1 &&
        document['content'] &&
        document['content'].length > 0
      ) {
        await this._send_data({ ...document })
        document['content'] = []
      }

      const id = await elem.evaluate((el) => el.id)
      if (tag === 'H1') {
        document['hierarchy_lvl1'] = text
        document['anchor'] = '#' + id
        await this._send_data({ ...document })
      } else if (tag === 'H2') {
        document['hierarchy_lvl2'] = text
        document['anchor'] = '#' + id
        document = this._remove_lower_hierarchies(document, 'hierarchy_lvl2')
        await this._send_data({ ...document })
      } else if (tag === 'H3') {
        document['hierarchy_lvl3'] = text
        document['anchor'] = '#' + id
        document = this._remove_lower_hierarchies(document, 'hierarchy_lvl3')
        await this._send_data({ ...document })
      } else if (tag === 'H4') {
        document['hierarchy_lvl4'] = text
        document['anchor'] = '#' + id
        document = this._remove_lower_hierarchies(document, 'hierarchy_lvl4')
        await this._send_data({ ...document })
      } else if (tag === 'H5') {
        document['hierarchy_lvl5'] = text
        document['anchor'] = '#' + id
        document = this._remove_lower_hierarchies(document, 'hierarchy_lvl5')
        await this._send_data({ ...document })
      } else if (
        (tag === 'P' || tag === 'TD' || tag === 'LI' || tag === 'SPAN') &&
        this._amount_of_hierarchies(document) > 1
      ) {
        if (!document['content']) {
          document['content'] = []
        }
        if (
          text !== null &&
          Array.isArray(document['content']) &&
          !document['content'].includes(text)
        ) {
          document['content'].push(text)
        }
      }
    }
    await this._send_data(document)
  }

  async _send_data(data: DocsSearchDocument) {
    try {
      this.counter++
      console.log(this.counter)

      data.hierarchy_radio_lvl0 = null
      data.hierarchy_radio_lvl1 = data.hierarchy_lvl1
      data.hierarchy_radio_lvl2 = data.hierarchy_lvl2
      data.hierarchy_radio_lvl3 = data.hierarchy_lvl3
      data.hierarchy_radio_lvl4 = data.hierarchy_lvl4
      data.hierarchy_radio_lvl5 = data.hierarchy_lvl5
      data.uid = uuidv4()
      data.url = data.url + '#' + data.anchor
      data.anchor = data.anchor.substring(1)
      // console.log('ADD_DATA', data.uid)
      if (Array.isArray(data['content'])) {
        data['content'] = data['content'].join('\n')
      } else {
        data['content'] = ''
      }
      await this.sender.add(data)
    } catch (e) {
      console.log(data)
      console.log('error', e)
    }
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
}
