/* eslint-disable @typescript-eslint/no-unsafe-call */
import { v4 as uuidv4 } from "uuid";
import { Sender } from "../sender";
import { Config, CustomDocument } from "../types";
import { CheerioAPI } from "cheerio";
import { Log } from "@crawlee/core";

const log = new Log({ prefix: "CustomScraper" });

export default class CustomScraper {
  sender: Sender;
  settings: Config["meilisearch_settings"];
  selectors: Config["selectors"];

  constructor(sender: Sender, config: Config) {
    log.info("Initializing CustomScraper", { config });
    this.sender = sender;
    this.selectors = config.selectors;
    this.settings = config.meilisearch_settings || {
      searchableAttributes: Object.keys(this.selectors || {}),
      distinctAttribute: "url",
    };
    void this.sender.updateSettings(this.settings);
  }

  async get(url: string, $: CheerioAPI) {
    try {
      log.debug("Starting content extraction", { url });

      const data: CustomDocument = {
        uid: uuidv4(),
        url,
      };

      for (const [key, selector] of Object.entries(this.selectors || {})) {
        const elements = $(selector);
        if (elements.length > 0) {
          data[key] = elements
            .map((_, el) => this._clean_text($(el).text()))
            .get();
          if (data[key].length === 1) {
            data[key] = data[key][0];
          }
        }
      }

      await this._add_data(data);
      log.info("Content extraction completed", { url });
    } catch (error) {
      log.error("Content extraction failed", { error, url });
    }
  }

  async _add_data(data: CustomDocument) {
    try {
      await this.sender.add(data);
      log.debug("Document added successfully", { url: data.url });
    } catch (error) {
      log.error("Failed to add document", { error, url: data.url });
    }
  }

  _clean_text(text: string) {
    text = text.replace(/[\r\n]+/gm, " ");
    text = text.replace(/\s+/g, " ");
    text = text.replace("# ", "");
    text = text.replace(/^\s+|\s+$/g, "");
    return text;
  }
}
