import { CheerioAPI } from 'cheerio'
import { Config, FullPageDocument } from '../../types'
import { Log } from 'crawlee'

const log = new Log({ prefix: 'Scraper: Schema' })

export async function processSchema(
  $: CheerioAPI,
  document: FullPageDocument,
  config: Config
): Promise<FullPageDocument> {
  if (
    !config.features ||
    !config.features.schema ||
    !config.features.schema.activated
  ) {
    return document
  }

  let schemaData: Record<string, any> = {}

  // First try JSON-LD
  const schemaScript = $('script[type="application/ld+json"]')
  if (schemaScript.length > 0) {
    try {
      schemaData = JSON.parse(schemaScript.html() || '{}')
    } catch (error) {
      log.error('Failed to parse JSON-LD schema:', { error })
    }
  }

  // If no JSON-LD found or parsing failed, try microdata
  if (Object.keys(schemaData).length === 0) {
    const microdataSchema = extractMicrodata($)
    if (Object.keys(microdataSchema).length > 0) {
      schemaData = microdataSchema
    }
  }

  // If still no schema found, try RDFa
  if (Object.keys(schemaData).length === 0) {
    const rdfaSchema = extractRDFa($)
    if (Object.keys(rdfaSchema).length > 0) {
      schemaData = rdfaSchema
    }
  }

  if (Object.keys(schemaData).length === 0) {
    return document
  }

  // Filter by type if specified
  if (
    config.features.schema.only_type &&
    schemaData['@type'] !== config.features.schema.only_type
  ) {
    return document
  }

  // Clean schema data
  cleanSchema(schemaData)

  // Convert dates if enabled
  if (config.features.schema.convert_dates) {
    convertDates(schemaData)
  }

  return {
    ...document,
    schema: schemaData,
  }
}

function extractMicrodata($: CheerioAPI): Record<string, any> {
  const schema: Record<string, any> = {}

  // Find elements with itemtype attribute
  $('[itemtype]').each((_, element) => {
    const $element = $(element)
    const itemType = $element.attr('itemtype')?.split('/').pop()
    if (!itemType) return

    const itemProps: Record<string, any> = {}

    // Get all itemprop attributes within this itemscope
    $element.find('[itemprop]').each((_, propElement) => {
      const $prop = $(propElement)
      const propName = $prop.attr('itemprop')
      if (!propName) return

      const content = $prop.attr('content') || $prop.text().trim()
      if (content) {
        itemProps[propName] = content
      }
    })

    if (Object.keys(itemProps).length > 0) {
      schema['@type'] = itemType
      Object.assign(schema, itemProps)
    }
  })

  return schema
}

function extractRDFa($: CheerioAPI): Record<string, any> {
  const schema: Record<string, any> = {}

  // Find elements with typeof attribute
  $('[typeof]').each((_, element) => {
    const $element = $(element)
    const typeOf = $element.attr('typeof')?.split(':').pop()
    if (!typeOf) return

    const properties: Record<string, any> = {}

    // Get all property attributes within this element
    $element.find('[property]').each((_, propElement) => {
      const $prop = $(propElement)
      const property = $prop.attr('property')?.split(':').pop()
      if (!property) return

      const content = $prop.attr('content') || $prop.text().trim()
      if (content) {
        properties[property] = content
      }
    })

    if (Object.keys(properties).length > 0) {
      schema['@type'] = typeOf
      Object.assign(schema, properties)
    }
  })

  return schema
}

function cleanSchema(data: Record<string, any>) {
  if (data['@context']) {
    delete data['@context']
  }
  if (data['@type']) {
    delete data['@type']
  }
  Object.keys(data).forEach((key) => {
    if (typeof data[key] === 'object') {
      cleanSchema(data[key])
    }
  })
}

function convertDates(data: Record<string, any>) {
  Object.keys(data).forEach((key) => {
    if (typeof data[key] === 'string') {
      const timestamp = Date.parse(data[key])
      if (!isNaN(timestamp)) {
        data[key] = timestamp
      }
    } else if (typeof data[key] === 'object') {
      convertDates(data[key])
    }
  })
}
