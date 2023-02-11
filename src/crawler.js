import { createPuppeteerRouter, PuppeteerCrawler } from "crawlee";

// Crawler class
// This class is responsible for crawling the urls and extract content to send to Meilisearch
// It uses the createPuppeteerRouter method to create a router that will be used by the PuppeteerCrawler.
// The constructor take a Sender object as a parameter
export default class Crawler {
  constructor(sender, config) {
    this.sender = sender;
    this.urls = config.urls;

    //Create the router
    let router = createPuppeteerRouter();
    router.addDefaultHandler(this.defaultHandler.bind(this));
    // router.addHandler("content", this.contentPageHandler.bind(this));

    // create the crawler
    this.crawler = new PuppeteerCrawler({
      // proxyConfiguration: new ProxyConfiguration({ proxyUrls: ['...'] }),
      requestHandler: router,
    });
  }

  async run() {
    await this.crawler.run(this.urls);
  }

  async defaultHandler({ request, enqueueLinks, page, log }) {
    const title = await page.title();
    log.info(`${title}`, { url: request.loadedUrl });
    const globs = this.urls.map((url) => {
      if (url.endsWith("/")) {
        return url + "**";
      }
      return url + "/**";
    });

    await this.__extractContent(request.loadedUrl, page);

    await enqueueLinks({
      globs,
    });
  }

  async __extractContent(url, page) {
    const title = await page.title();
    ///get the meta of the page
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

    ///for each page create dataset of consecutive h1, h2, h3, p. at each header after a paragraph, create a new dataset
    let data = {};
    let elems = await page.$$("h1, h2, h3, p, td, li");
    for (let i = 0; i < elems.length; i++) {
      let elem = elems[i];
      let tag = await elem.evaluate((el) => el.tagName);
      let text = await elem.evaluate((el) => el.textContent);
      ///remove new lines
      text = text.replace(/[\r\n]+/gm, " ");
      ///remove multiple spaces
      text = text.replace(/\s+/g, " ");
      ///remove " (opens new window)"
      text = text.replace(/ \((opens new window)\)/g, "");
      ///remove '# ' from headers
      if (
        tag === "H1" ||
        tag === "H2" ||
        tag === "H3" ||
        tag === "H4" ||
        tag === "H5" ||
        tag === "H6"
      ) {
        text = text.replace("# ", "");
      }
      let id = await elem.evaluate((el) => el.id);
      data.uid = i;
      data.url = url;
      data.title = title;
      data.meta = meta;
      if (tag === "H1") {
        if (data["h1"]) {
          await this.sender.add(data);
          data = {};
        }
        data["h1"] = text;
        data.anchor = "#" + id;
      } else if (tag === "H2") {
        if (data["h2"]) {
          await this.sender.add(data);
          data = { h1: data["h1"] };
        }
        data.anchor = "#" + id;
        data["h2"] = text;
      } else if (tag === "H3") {
        if (data["h3"]) {
          await this.sender.add(data);
          data = { h1: data["h1"], h2: data["h2"] };
        }
        data.anchor = "#" + id;
        data["h3"] = text;
      } else if (tag === "H4") {
        if (data["h4"]) {
          await this.sender.add(data);
          data = { h1: data["h1"], h2: data["h2"], h3: data["h3"] };
        }
        data.anchor = "#" + id;
        data["h4"] = text;
      } else if (tag === "H5") {
        if (data["h5"]) {
          await this.sender.add(data);
          data = {
            h1: data["h1"],
            h2: data["h2"],
            h3: data["h3"],
            h4: data["h4"],
          };
        }
        data.anchor = "#" + id;
        data["h5"] = text;
      } else if (tag === "H6") {
        if (data["h6"]) {
          await this.sender.add(data);
          data = {
            h1: data["h1"],
            h2: data["h2"],
            h3: data["h3"],
            h4: data["h4"],
            h5: data["h5"],
          };
        }
        data.anchor = "#" + id;
        data["h6"] = text;
      } else if (tag === "P" || tag === "TD" || tag === "LI") {
        if (!data["p"]) {
          data["p"] = [];
        }
        if (!data["p"].includes(text)) {
          data["p"].push(text);
        }
      }
      if (i === elems.length - 1) {
        await this.sender.add(data);
      }
    }
  }

  async __sendData(data) {
    await this.sender.add(data);
  }
}
