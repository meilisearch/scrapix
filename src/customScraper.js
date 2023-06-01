import prettier from "prettier";

export default class CustomScaper {
  constructor(sender, config) {
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

    await this.sender.add(data);
  }
}
