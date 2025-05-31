import { CheerioAPI } from 'cheerio'
import { Config, FullPageDocument } from '../../types'
import axios from 'axios'
import { cleanHtml } from '../../utils/html_cleaner'
import { Log } from 'crawlee'

const log = new Log({ prefix: 'Scraper: AI Summary' })

export async function processAISummary(
  $: CheerioAPI,
  document: FullPageDocument,
  config: Config
): Promise<FullPageDocument> {
  const feature = config.features?.ai_summary
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

    // Generate summary
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: model,
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that creates concise summaries of HTML content.',
          },
          {
            role: 'user',
            content: `Please provide a concise summary of HTML content that will be then used to generate an embedding representation of the page. \n\n HTML:\n${cleanedHtml}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 150,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
      }
    )

    const summary = response.data.choices[0].message.content

    // Add summary to the document
    return {
      ...document,
      ai_summary: summary,
    }
  } catch (error: any) {
    log.error('AI summary failed', { error })
    return document
  }
}
