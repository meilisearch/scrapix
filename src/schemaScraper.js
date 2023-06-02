import prettier from "prettier";
import { v4 as uuidv4 } from "uuid";

export default class SchemaScaper {
  constructor(sender, config) {
    this.sender = sender;
    this.config = config;
    this.settings_sent = false;

    if (config.custom_settings) {
      this.sender.updateSettings(config.custom_settings);
      this.settings_sent = true;
    }
  }

  async get(url, page) {
    console.log("__extractContent", url);
    // Get the schema.org data
    const data = await page.evaluate(() => {
      const schema = document.querySelector(
        "script[type='application/ld+json']"
      );
      if (schema) {
        return JSON.parse(schema.innerText);
      }
      return {};
    });

    _clean_schema(data);

    // convert dates to timestamps
    Object.keys(data).forEach((key) => {
      if (typeof data[key] === "string") {
        // check if it is a date
        if (Date.parse(data[key])) {
          data[key] = Date.parse(data[key]);
        }
      }
    });

    if (!this.settings_sent) {
      await this._discover_and_push_settings(data);
    }

    data.uid = uuidv4();

    await this.sender.add(data);
  }

  // Try to discover the best settings for Meilisearch from the schema.org data
  async _discover_and_push_settings(data) {
    let settings = {};
    // Recusivelly flatten the schema.org data

    data = _flatten_data(data);

    // Get searchable attributes
    Object.keys(data).forEach((key) => {
      // Get searchable attributes
      if (typeof data[key] === "string") {
        // check if it is an url
        if (data[key].startsWith("http")) {
          return;
        }
        settings.searchableAttributes.push(key);
      }
      // Get sortable attributes
      if (typeof data[key] === "number") {
        settings.sortableAttributes.push(key);
      }
      // Get filterable attributes
      if (typeof data[key] === "boolean" || typeof data[key] === "array") {
        settings.filterableAttributes.push(key);
      }
    });
    this.sender.updateSettings(config.custom_settings);
    this.settings_sent = true;
  }

  _clean_schema(data) {
    if (data["@context"]) {
      delete data["@context"];
    }
    if (data["@type"]) {
      delete data["@type"];
    }
    Object.keys(data).forEach((key) => {
      if (typeof data[key] === "object") {
        this._clean_schema(data[key]);
      }
    });
  }

  __flatten_data(obj, prefix = "") {
    Object.keys(obj).reduce((acc, k) => {
      const pre = prefix.length ? prefix + "." : "";
      if (
        typeof obj[k] === "object" &&
        obj[k] !== null &&
        Object.keys(obj[k]).length > 0
      ) {
        Object.assign(acc, __flatten_data(obj[k], pre + k));
      }
      acc[pre + k] = obj[k];
      return acc;
    }, {});

    return obj;
  }
}
