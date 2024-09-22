/* eslint-disable @typescript-eslint/no-unsafe-call */
import { v4 as uuidv4 } from 'uuid'
import { Sender } from '../sender'
import { Config, SchemaDocument } from '../types'
import { CheerioAPI } from 'cheerio'

export default class SchemaScraper {
  sender: Sender
  config: Config
  settings_sent: boolean

  constructor(sender: Sender, config: Config) {
    console.info('SchemaScraper::constructor')
    this.sender = sender
    this.config = config
    this.settings_sent = false

    if (this.config.meilisearch_settings) {
      void this.sender.updateSettings(this.config.meilisearch_settings)
      this.settings_sent = true
    }
  }

  async get(url: string, $: CheerioAPI) {
    console.log('__extractContent', url)
    // Get the schema.org data
    const schemaScript = $('script[type="application/ld+json"]')
    let data: SchemaDocument = { uid: '' }

    if (schemaScript.length > 0) {
      try {
        data = JSON.parse(schemaScript.html() || '{}') as SchemaDocument
      } catch (error) {
        console.error('Error parsing JSON-LD:', error)
        return
      }
    }

    if (Object.keys(data).length === 0) return

    if (this.config.schema_settings?.only_type) {
      if (data['@type'] !== this.config.schema_settings?.only_type) return
    }

    this._clean_schema(data)

    if (this.config.schema_settings?.convert_dates) {
      // convert dates to timestamps
      Object.keys(data).forEach((key) => {
        if (typeof data[key] === 'string') {
          // check if it is a date
          if (Date.parse(data[key])) {
            data[key] = Date.parse(data[key])
          }
        }
      })
    }

    if (data['@graph']) {
      for (const graph of data['@graph']) {
        graph.uid = uuidv4()
        await this.sender.add(graph)
      }
    } else {
      data.uid = uuidv4()
      await this.sender.add(data)
    }
  }

  _clean_schema(data: SchemaDocument) {
    if (data['@context']) {
      delete data['@context']
    }
    if (data['@type']) {
      delete data['@type']
    }
    Object.keys(data).forEach((key) => {
      if (typeof data[key] === 'object') {
        this._clean_schema(data[key])
      }
    })
  }
}
