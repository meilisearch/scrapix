import prettier from "prettier";
import { v4 as uuidv4 } from "uuid";

export default class SchemaScaper {
  constructor(sender, config) {
    console.info("SchemaScaper::constructor");
    this.sender = sender;
    this.config = config;
    this.settings_sent = false;

    if (this.config.custom_settings) {
      this.sender.updateSettings(this.config.custom_settings);
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

    if (this.config.schema?.only_type) {
      if (data["@type"] !== this.config.schema_config?.only_type) return;
    }

    this._clean_schema(data);

    if (this.config.schema?.convert_dates) {
      // convert dates to timestamps
      Object.keys(data).forEach((key) => {
        if (typeof data[key] === "string") {
          // check if it is a date
          if (Date.parse(data[key])) {
            data[key] = Date.parse(data[key]);
          }
        }
      });
    }

    data.uid = uuidv4();

    await this.sender.add(data);
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
}
