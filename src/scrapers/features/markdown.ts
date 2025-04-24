import { CheerioAPI } from "cheerio";
import { Config, FullPageDocument } from "../../types";
import { NodeHtmlMarkdown } from "node-html-markdown";

export async function processMarkdown($: CheerioAPI, document: FullPageDocument, config: Config): Promise<FullPageDocument> {
  if (!config.features || !config.features.markdown || !config.features.markdown.activated) {
    return document;
  }

  // Convert HTML to Markdown
  const markdown = NodeHtmlMarkdown.translate($.html());

  return {
    ...document,
    markdown
  };
} 