import prettier from "prettier";
import { v4 as uuidv4 } from "uuid";

export default class CustomScaper {
  constructor(sender, config) {
    console.log("init CustomScaper");
    this.sender = sender;
    this.config = config;

    if (config.custom_settings) {
      this.sender.updateSettings(config.custom_settings);
    }
  }

  async get(url, page) {
    console.log("__extractContent", url);
    let data = {};
    if (this.custom_crawler.get_title || false) {
      data.title = await page.title();
    }

    data.uid = uuidv4();

    if (this.custom_crawler.get_meta || false) {
      const meta = await page.evaluate(() => {
        const metas = document.getElementsByTagName("meta");
        const meta = {};
        for (let i = 0; i < metas.length; i++) {
          const name = metas[i].getAttribute("name");
          const content = metas[i].getAttribute("content");
          if (name && content) {
            meta[name] = content;
          }
        }
        return meta;
      });
      data.meta = meta;
    }

    if (this.custom_crawler.get_url || false) {
      data.url = url;
    }

    await this.sender.add(data);
  }
}
