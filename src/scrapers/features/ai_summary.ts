import { CheerioAPI } from 'cheerio'
import { Config, FullPageDocument } from '../../types'
import axios from 'axios'
import { cleanHtml } from '../utils/html_cleaner'

export async function processAISummary(
  $: CheerioAPI,
  document: FullPageDocument,
  config: Config
): Promise<FullPageDocument> {
  const feature = config.features?.ai_summary
  if (!feature?.activated) return document

  const modelConfig = feature.model_config
  if (!modelConfig?.api_key) {
    console.warn('OpenAI API key not provided for AI summary')
    return document
  }

  try {
    // Clean the HTML content
    const cleanedHtml = cleanHtml($)

    // Generate summary
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: modelConfig.model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that creates concise summaries of HTML content.',
          },
          {
            role: 'user',
            content: `Please provide a concise summary of the following HTML content:\n\n${cleanedHtml}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 150,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${modelConfig.api_key}`,
        },
      }
    )

    const summary = response.data.choices[0].message.content

    // Add summary to the document
    return {
      ...document,
      ai_summary: summary,
    }
  } catch (error) {
    console.error('AI summary failed:', error)
    return document
  }
}
