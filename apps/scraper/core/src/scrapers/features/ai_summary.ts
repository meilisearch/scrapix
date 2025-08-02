import { CheerioAPI } from 'cheerio'
import { Config, FullPageDocument } from '../../types'
import { cleanHtml } from '../../utils/html_cleaner'
import { Log } from 'crawlee'
import { getConfig } from '../../constants'
import { openaiHttpClient } from '../../utils/http_client'

const log = new Log({ prefix: 'Scraper: AI Summary' })

/**
 * Generate AI-powered summary of page content
 * 
 * @param {CheerioAPI} $ - Cheerio instance with loaded HTML
 * @param {FullPageDocument} document - The document being processed
 * @param {Config} config - Crawler configuration
 * @returns {Promise<FullPageDocument>} Document with AI summary added
 * 
 * @description
 * Uses OpenAI GPT to generate concise summaries of HTML content.
 * The summary is optimized for embedding generation and search relevance.
 * Requires OPENAI_API_KEY environment variable to be set.
 * 
 * @example
 * ```typescript
 * const enrichedDoc = await processAISummary($, document, config);
 * console.log(enrichedDoc.ai_summary);
 * ```
 */
export async function processAISummary(
  $: CheerioAPI,
  document: FullPageDocument,
  config: Config
): Promise<FullPageDocument> {
  const feature = config.features?.ai_summary
  if (!feature?.activated) return document

  const apiKey = process.env.OPENAI_API_KEY
  const model = getConfig('AI', 'DEFAULT_MODEL')

  if (!apiKey) {
    log.warning('OpenAI API key not provided in environment variables')
    return document
  }

  try {
    // Clean the HTML content
    const cleanedHtml = cleanHtml($)

    // Generate summary
    const response = await openaiHttpClient.post(
      '/chat/completions',
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
        temperature: getConfig('AI', 'SUMMARY_TEMPERATURE'),
        max_tokens: getConfig('AI', 'SUMMARY_MAX_TOKENS'),
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
