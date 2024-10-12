/* eslint-disable @typescript-eslint/no-unsafe-call */
import { v4 as uuidv4 } from "uuid";
import { Sender } from "../sender";
import { Config } from "../types";
import { CheerioAPI } from "cheerio";
import {
  DocsSearchDocument,
  HTag,
  HierarchyLevel,
  RadioHierarchyLevel,
} from "../types";
import { Log } from "@crawlee/core";

const log = new Log({ prefix: "DocsearchScraper" });

const RADIO_HIERARCHY_LEVELS: Record<HTag, keyof RadioHierarchyLevel> = {
  H1: "hierarchy_radio_lvl1",
  H2: "hierarchy_radio_lvl2",
  H3: "hierarchy_radio_lvl3",
  H4: "hierarchy_radio_lvl4",
  H5: "hierarchy_radio_lvl5",
};

const HIERARCHY_LEVELS: Record<HTag, keyof HierarchyLevel> = {
  H1: "hierarchy_lvl1",
  H2: "hierarchy_lvl2",
  H3: "hierarchy_lvl3",
  H4: "hierarchy_lvl4",
  H5: "hierarchy_lvl5",
};

const TAG_LEVELS: Record<HTag, number> = {
  H1: 100,
  H2: 90,
  H3: 80,
  H4: 70,
  H5: 60,
};

export default class DocsearchScraper {
  sender: Sender;
  settings: Config["meilisearch_settings"];

  constructor(sender: Sender, config?: Config) {
    log.info("Initializing DocsearchScraper", { config });
    this.sender = sender;

    // Predefined settings
    const defaultSettings = {
      distinctAttribute: "url",
      rankingRules: [
        "words",
        "typo",
        "attribute",
        "proximity",
        "exactness",
        "page_rank:desc",
        "level:desc",
        "position:asc",
      ],
      searchableAttributes: [
        "hierarchy_radio_lvl1",
        "hierarchy_radio_lvl2",
        "hierarchy_radio_lvl3",
        "hierarchy_radio_lvl4",
        "hierarchy_radio_lvl5",
        "hierarchy_lvl1",
        "hierarchy_lvl2",
        "hierarchy_lvl3",
        "hierarchy_lvl4",
        "hierarchy_lvl5",
        "hierarchy_radio_lvl0",
        "hierarchy_lvl0",
        "content",
      ],
    };

    // Merge user-defined settings with predefined settings
    this.settings = {
      ...defaultSettings,
      ...(config?.meilisearch_settings || {}),
    };

    void this.sender.updateSettings(this.settings);
  }

  _amount_of_hierarchies(pageMap: DocsSearchDocument) {
    return Object.keys(pageMap).filter((key) => key.startsWith("hierarchy_lvl"))
      .length;
  }
  _is_h_tag(tag: string) {
    return tag.startsWith("H");
  }

  // Remove all hierarchies that are lower than the current level.
  // Considering hierarchy_level_5 is lower than hierarchy_level_4.
  _remove_lower_lvl_hierarchies(
    pageMap: DocsSearchDocument,
    currentLevel: string
  ): DocsSearchDocument {
    for (const hierarchy in pageMap) {
      const levelMatch = hierarchy.match(/\d+/) || [];
      const currentLevelMatch = currentLevel.match(/\d+/) || [];
      if (levelMatch[0] && currentLevelMatch[0]) {
        if (parseInt(levelMatch[0]) > parseInt(currentLevelMatch[0])) {
          delete pageMap[hierarchy as keyof DocsSearchDocument];
        }
      }
    }
    return pageMap;
  }

  _empty_radio_lvl_hierarchies(
    document: DocsSearchDocument
  ): DocsSearchDocument {
    return {
      ...document,
      hierarchy_radio_lvl0: null,
      hierarchy_radio_lvl1: null,
      hierarchy_radio_lvl2: null,
      hierarchy_radio_lvl3: null,
      hierarchy_radio_lvl4: null,
      hierarchy_radio_lvl5: null,
    };
  }

  _fill_lvl_fields(
    document: DocsSearchDocument,
    tag: HTag,
    text: string
  ): DocsSearchDocument {
    return {
      ...document,
      [HIERARCHY_LEVELS[tag]]: text,
      [RADIO_HIERARCHY_LEVELS[tag]]: text,
    };
  }

  _update_document(
    document: DocsSearchDocument,
    tag: HTag,
    text: string,
    anchor?: string
  ): DocsSearchDocument {
    document = {
      ...document,
      level: TAG_LEVELS[tag],
    };
    document = this._empty_radio_lvl_hierarchies(document);
    document = this._remove_lower_lvl_hierarchies(
      document,
      HIERARCHY_LEVELS[tag]
    );
    document = this._fill_lvl_fields(document, tag, text);
    document["anchor"] = anchor ? `#${anchor}` : "";
    return document;
  }

  async get(url: string, $: CheerioAPI) {
    let elems = $(
      "main h1, main h2, main h3, main h4, main h5, main p, main td, main li, main span"
    );
    if (elems.length === 0) {
      elems = $("h1, h2, h3, h4, h5, p, td, li, span");
    }
    let document = {} as DocsSearchDocument;
    document = this._empty_radio_lvl_hierarchies(document);

    for (const elem of elems.toArray()) {
      const tag = elem.tagName.toUpperCase();
      let text = $(elem).text();
      text = this._clean_text(text);

      const urls_tags = new URL(url).pathname.split("/");
      const only_urls_tags = urls_tags.slice(1, urls_tags.length - 1);
      document["hierarchy_lvl0"] = only_urls_tags.join(" > ") || "";
      document["url"] = url;

      if (
        this._is_h_tag(tag) &&
        this._amount_of_hierarchies(document) > 1 &&
        document["content"] &&
        document["content"].length > 0
      ) {
        await this._send_data({ ...document, type: "content" });
        document["content"] = [];
      }

      const anchor = $(elem).attr("id") || "";
      if (tag === "H1") {
        document = Object.assign(
          {},
          this._update_document(document, tag as HTag, text, anchor)
        );
      } else if (tag === "H2") {
        document = Object.assign(
          {},
          this._update_document(document, tag as HTag, text, anchor)
        );
      } else if (tag === "H3") {
        document = Object.assign(
          {},
          this._update_document(document, tag as HTag, text, anchor)
        );
      } else if (tag === "H4") {
        document = Object.assign(
          {},
          this._update_document(document, tag as HTag, text, anchor)
        );
      } else if (tag === "H5") {
        document = Object.assign(
          {},
          this._update_document(document, tag as HTag, text, anchor)
        );
      } else if (
        (tag === "P" || tag === "TD" || tag === "LI" || tag === "SPAN") &&
        this._amount_of_hierarchies(document) > 1
      ) {
        if (!document["content"]) {
          document["content"] = [];
        }
        if (
          text !== null &&
          Array.isArray(document["content"]) &&
          !document["content"].includes(text)
        ) {
          document["content"].push(text);
        }
      }
    }

    // Send remaining data
    if (document.content && document.content?.length > 0) {
      await this._send_data({ ...document });
    }
  }

  async _send_data(data: DocsSearchDocument) {
    try {
      data.uid = uuidv4();
      data.url = data.url + data.anchor;
      if (Array.isArray(data["content"])) {
        data["content"] = data["content"].join("\n");
      } else {
        data["content"] = "";
      }
      await this.sender.add(data);
      log.debug("Document sent successfully", { url: data.url });
    } catch (e) {
      log.error("Failed to send document", { error: e, url: data.url });
    }
  }

  // Remove from a text all multiple spaces, new lines, and leading and trailing spaces, and
  // remove '# ' from the beginning of the text
  _clean_text(text: string) {
    text = text.replace(/[\r\n]+/gm, " ");
    ///remove multiple spaces
    text = text.replace(/\s+/g, " ");
    ///remove '# '
    text = text.replace("# ", "");
    /// Trim leading and trailing spaces
    text = text.replace(/^\s+|\s+$/g, "");
    return text;
  }
}
