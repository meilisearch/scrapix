/* eslint-disable @typescript-eslint/no-unsafe-call */
import { v4 as uuidv4 } from "uuid";
import { Sender } from "../sender";
import { Config, Meta, MarkdownDocument } from "../types";
import { CheerioAPI, load } from "cheerio";
import { Log } from "@crawlee/core";
import { NodeHtmlMarkdown } from "node-html-markdown";

const log = new Log({ prefix: "MarkdownScraper" });

export default class MarkdownScraper {
  sender: Sender;
  settings: Config["meilisearch_settings"];

  constructor(sender: Sender, config: Config) {
    log.info("Initializing MarkdownScraper", { config });
    this.sender = sender;
    this.settings = config.meilisearch_settings || {
      searchableAttributes: ["title", "description", "content"],
      filterableAttributes: ["urls_tags"],
      distinctAttribute: "url",
    };
    void this.sender.updateSettings(this.settings);
  }

  async get(url: string, $: CheerioAPI) {
    try {
      log.debug("Starting content extraction", { url });
      const title = $("title").text();
      const meta = this._extract_metadata_from_page($);
      const metaDescription = meta.description || "";

      const sanitizedHtml = this.sanitizeHtml($.html());
      const content = NodeHtmlMarkdown.translate(sanitizedHtml);

      const data: MarkdownDocument = {
        uid: uuidv4(),
        url,
        title,
        description: metaDescription,
        content,
        meta,
        urls_tags: new URL(url).pathname.split("/").filter(Boolean),
      };

      await this._add_data(data);
      log.info("Content extraction completed", { url });
    } catch (error) {
      log.error("Content extraction failed", { error, url });
    }
  }

  async _add_data(data: MarkdownDocument) {
    try {
      await this.sender.add(data);
      log.debug("Document added successfully", { url: data.url });
    } catch (error) {
      log.error("Failed to add document", { error, url: data.url });
    }
  }

  private sanitizeHtml(html: string, selector?: string) {
    const $ = load(html);

    if (selector) {
      const selectedHtml = $(selector).html();

      if (!selectedHtml || !selectedHtml.trim()) {
        throw new Error(`No content found for selector: ${selector}`);
      }

      return selectedHtml;
    }

    $("script, style, path, footer, header, head, nav").remove();

    return $.html();
  }

  _extract_metadata_from_page($: CheerioAPI): Meta {
    const meta: Meta = {};
    $("meta").each((_, elem) => {
      const name = $(elem).attr("name");
      const content = $(elem).attr("content");
      if (name && content) {
        meta[name] = content;
      }
    });
    return meta;
  }
}
