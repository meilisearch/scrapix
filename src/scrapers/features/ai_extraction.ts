import { CheerioAPI } from "cheerio";
import { Config, FullPageDocument } from "../../types";
import axios from "axios";
import { cleanHtml } from "../utils/html_cleaner";

export async function processAIExtraction(
  $: CheerioAPI,
  document: FullPageDocument,
  config: Config
): Promise<FullPageDocument> {
  const feature = config.features?.ai_extraction;
  if (!feature?.activated) return document;

  const modelConfig = feature.model_config;
  if (!modelConfig?.api_key) {
    console.warn("OpenAI API key not provided for AI extraction");
    return document;
  }

  try {
    // Clean the HTML content
    const cleanedHtml = cleanHtml($);

    // Process each prompt
    const extractedData: Record<string, any> = {};
    for (const prompt of feature.prompts || []) {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: modelConfig.model || "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that extracts structured information from HTML content. Respond with valid JSON only."
            },
            {
              role: "user",
              content: `${prompt.prompt}\n\nHTML content to analyze:\n${cleanedHtml}`
            }
          ],
          temperature: 0.1,
          response_format: { type: "json_object" }
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${modelConfig.api_key}`
          }
        }
      );

      const result = response.data.choices[0].message.content;
      try {
        const parsedResult = JSON.parse(result);
        extractedData[prompt.prompt] = parsedResult;
      } catch (e) {
        console.error("Failed to parse AI extraction result:", e);
      }
    }

    // Add extracted data to the document
    return {
      ...document,
      ai_extraction: extractedData
    };
  } catch (error) {
    console.error("AI extraction failed:", error);
    return document;
  }
} 