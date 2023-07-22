import { v4 as uuidv4 } from 'uuid'
import { Page } from 'puppeteer'
import { Sender } from '../sender.js'
import { Config, SchemaDocument } from '../types.js'

export default class SchemaScaper {
  sender: Sender
  config: Config
  settings_sent: boolean

  constructor(sender: Sender, config: Config) {
    console.info('SchemaScaper::constructor')
    this.sender = sender
    this.config = config
    this.settings_sent = false

    if (this.config.meilisearch_settings) {
      void this.sender.updateSettings(this.config.meilisearch_settings)
      this.settings_sent = true
    }
  }

  async get(url: string, page: Page) {
    console.log('__extractContent', url)
    // Get the schema.org data
    const data = (await page.evaluate((): Record<string, any> => {
      const schema = document.querySelector<HTMLElement>(
        "script[type='application/ld+json']"
      )
      if (schema) {
        return JSON.parse(schema.innerText) as Record<string, any>
      }
      return {} // TODO: raise error
    })) as SchemaDocument

    // TODO: use zod here instead of forcing `as SchemaDocument`?

    if (data.length === 0) return

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

    if (data["@graph"]) {
      for (const graph of data["@graph"]) {
        graph.uid = uuidv4();
        await this.sender.add(graph);
      };
    } else {
      data.uid = uuidv4();
      await this.sender.add(data);
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
