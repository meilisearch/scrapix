/* eslint-disable @typescript-eslint/no-unsafe-call */
import { v4 as uuidv4 } from "uuid";
import { Sender } from "../sender";
import { Config, Meta, DefaultDocument } from "../types";
import { CheerioAPI } from "cheerio";
import { Log } from "@crawlee/core";

const log = new Log({ prefix: "DefaultScraper" });

export default class DefaultScraper {
  sender: Sender;
  settings: Config["meilisearch_settings"];

  constructor(sender: Sender, config: Config) {
    log.info("Initializing DefaultScraper", { config });
    this.sender = sender;
    this.settings = config.meilisearch_settings || {
      searchableAttributes: [
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "p",
        "title",
        "meta.description",
      ],
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

      let data: DefaultDocument = {} as DefaultDocument;
      let elems = $(
        "main h1, main h2, main h3, main h4, main h5, main h6, main p, main td, main li, main span"
      );
      if (elems.length === 0) {
        elems = $("h1, h2, h3, h4, h5, h6, p, td, li, span");
      }
      let page_block = 0;

      for (const elem of elems.toArray()) {
        const tag: any = elem.tagName.toUpperCase();
        let text = $(elem).text();
        text = this._clean_text(text);
        data.uid = uuidv4();
        data.url = url;
        data.title = title;
        data.meta = meta;
        data.image_url = this._get_image_url_from_meta(meta);
        data.page_block = page_block;
        const urls_tags = new URL(url).pathname.split("/");
        data.urls_tags = urls_tags.slice(1, urls_tags.length - 1);

        const id = ($(elem).attr("id") as string) || "";
        if (tag === "H1") {
          if (data["h1"]) {
            await this._add_data(data);
            page_block++;
            data = {} as DefaultDocument;
          }
          data["h1"] = text;
          data.anchor = "#" + id;
        } else if (tag === "H2") {
          if (data["h2"]) {
            await this._add_data(data);
            page_block++;
            data = { h1: data["h1"] } as DefaultDocument;
          }
          data.anchor = "#" + id;
          data["h2"] = text;
        } else if (tag === "H3") {
          if (data["h3"]) {
            await this._add_data(data);
            page_block++;
            data = { h1: data["h1"], h2: data["h2"] } as DefaultDocument;
          }
          data.anchor = "#" + id;
          data["h3"] = text;
        } else if (tag === "H4") {
          if (data["h4"]) {
            await this._add_data(data);
            page_block++;
            data = {
              h1: data["h1"],
              h2: data["h2"],
              h3: data["h3"],
            } as DefaultDocument;
          }
          data.anchor = "#" + id;
          data["h4"] = text;
        } else if (tag === "H5") {
          if (data["h5"]) {
            await this._add_data(data);
            page_block++;
            data = {
              h1: data["h1"],
              h2: data["h2"],
              h3: data["h3"],
              h4: data["h4"],
            } as DefaultDocument;
          }
          data.anchor = "#" + id;
          data["h5"] = text;
        } else if (tag === "H6") {
          if (data["h6"]) {
            await this._add_data(data);
            page_block++;
            data = {
              h1: data["h1"],
              h2: data["h2"],
              h3: data["h3"],
              h4: data["h4"],
              h5: data["h5"],
            } as DefaultDocument;
          }
          data.anchor = "#" + id;
          data["h6"] = text;
        } else if (
          tag === "P" ||
          tag === "TD" ||
          tag === "LI" ||
          tag === "SPAN"
        ) {
          if (!data["p"]) {
            data["p"] = [];
          }
          if (text && Array.isArray(data["p"]) && !data["p"].includes(text)) {
            data["p"].push(text);
          }
        }
      }

      // Add the last data block if it exists
      if (data.title) {
        await this._add_data(data);
      }
      log.info("Content extraction completed", { url });
    } catch (error) {
      log.error("Content extraction failed", { error, url });
    }
  }

  async _add_data(data: DefaultDocument) {
    try {
      if (Array.isArray(data["p"])) {
        data["p"] = data["p"].join("\n");
      }
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

  _get_image_url_from_meta(meta: Meta) {
    if (meta["og:image"]) {
      return meta["og:image"];
    } else if (meta["twitter:image"]) {
      return meta["twitter:image"];
    } else if (meta["image"]) {
      return meta["image"];
    }
    return undefined;
  }
}
