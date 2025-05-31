import { CheerioAPI } from 'cheerio'
import { Config, FullPageDocument } from '../../types'
import axios from 'axios'
import { cleanHtml } from '../utils/html_cleaner'
import { Log } from 'crawlee'

const log = new Log({ prefix: 'Scraper: AI Extraction' })

export async function processAIExtraction(
  $: CheerioAPI,
  document: FullPageDocument,
  config: Config
): Promise<FullPageDocument> {
  const feature = config.features?.ai_extraction
  if (!feature?.activated) return document

  const apiKey = process.env.OPENAI_API_KEY
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini'

  if (!apiKey) {
    log.warning('OpenAI API key not provided in environment variables')
    return document
  }

  try {
    // Clean the HTML content
    const cleanedHtml = cleanHtml($)

    // Truncate content if it's too long (OpenAI has token limits)
    const maxLength = 4000 // Adjust this based on your needs
    const truncatedHtml =
      cleanedHtml.length > maxLength
        ? cleanedHtml.substring(0, maxLength) + '...'
        : cleanedHtml

    // Process each prompt
    const prompt = feature.prompt
    if (!prompt) {
      log.warning('No prompt provided for AI extraction')
      return document
    }

    const extractedData: Record<string, any> = {}
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: model,
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful assistant that extracts structured information from HTML content. Respond with valid JSON only.',
            },
            {
              role: 'user',
              content: `${prompt}\n\nHTML content to analyze:\n${truncatedHtml}`,
            },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 30000, // 30 second timeout
        }
      )

      const result = response.data.choices[0].message.content
      try {
        const parsedResult = JSON.parse(result)
        extractedData[prompt] = parsedResult
      } catch (e) {
        log.error('Failed to parse AI extraction result', { error: e })
        extractedData[prompt] = { error: 'Failed to parse result' }
      }
    } catch (error: any) {
      log.error(`AI extraction failed for prompt "${prompt}":`, { error })
      if (error.response?.data?.error) {
        log.error('OpenAI API error:', error.response.data.error)
      }
      extractedData[prompt] = { error: 'Extraction failed' }
    }

    // Add extracted data to the document
    return {
      ...document,
      ai_extraction: extractedData,
    }
  } catch (error: any) {
    log.error('AI extraction failed:', error.message)
    if (error.response?.data?.error) {
      log.error('OpenAI API error:', error.response.data.error)
    }
    return document
  }
}
