import { createPuppeteerRouter, PuppeteerCrawler } from "crawlee";
import { v4 as uuidv4 } from "uuid";
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
      launchContext: {
        launchOptions: {
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
          ignoreDefaultArgs: ["--disable-extensions"],
        },
      },
    });
  }

  async run() {
    await this.crawler.run(this.urls);
  }

  async defaultHandler({ request, enqueueLinks, page, log }) {
    const title = await page.title();
    // log.info(`${title}`, { url: request.loadedUrl });
    const globs = this.urls.map((url) => {
      if (url.endsWith("/")) {
        return url + "**";
      }
      return url + "/**";
    });

    if (!this.__isPaginatedUrl(request.loadedUrl)) {
      await this.__extractContent(request.loadedUrl, page);
    }

    await enqueueLinks({
      globs,
      transformRequestFunction: (req) => {
        // exclude all links that are files not parsable by puppeteer
        if (this.__isFileUrl(req.url)) {
          return false;
        }
        return req;
      },
    });
  }

  async __extractContent(url, page) {
    console.log("__extractContent", url);
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
    let elems = await page.$$(
      "main h1, main h2, main h3, main h4, main h5, main h6, main p, main td, main li, main span"
    );
    if (elems.length === 0) {
      elems = await page.$$("h1, h2, h3, h4, h5, h6, p, td, li, span");
    }
    let page_block = 0;
    for (let i = 0; i < elems.length; i++) {
      let elem = elems[i];
      let tag = await elem.evaluate((el) => el.tagName);
      let text = await elem.evaluate((el) => el.textContent);
      text = this.__cleanText(text);
      data.uid = uuidv4();
      data.url = url;
      data.title = title;
      data.meta = meta;
      if (meta["og:image"]) {
        data.image_url = meta["og:image"];
      } else if (meta["twitter:image"]) {
        data.image_url = meta["twitter:image"];
      } else if (meta["image"]) {
        data.image_url = meta["image"];
      }
      data.page_block = page_block;
      let urls_tags = new URL(url).pathname.split("/");
      data.urls_tags = urls_tags.slice(1, urls_tags.length - 1);

      let id = await elem.evaluate((el) => el.id);
      if (tag === "H1") {
        if (data["h1"]) {
          await this.sender.add(data);
          page_block++;
          data = {};
        }
        data["h1"] = text;
        data.anchor = "#" + id;
      } else if (tag === "H2") {
        if (data["h2"]) {
          await this.sender.add(data);
          page_block++;
          data = { h1: data["h1"] };
        }
        data.anchor = "#" + id;
        data["h2"] = text;
      } else if (tag === "H3") {
        if (data["h3"]) {
          await this.sender.add(data);
          page_block++;
          data = { h1: data["h1"], h2: data["h2"] };
        }
        data.anchor = "#" + id;
        data["h3"] = text;
      } else if (tag === "H4") {
        if (data["h4"]) {
          await this.sender.add(data);
          page_block++;
          data = { h1: data["h1"], h2: data["h2"], h3: data["h3"] };
        }
        data.anchor = "#" + id;
        data["h4"] = text;
      } else if (tag === "H5") {
        if (data["h5"]) {
          await this.sender.add(data);
          page_block++;
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
          page_block++;
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
      } else if (
        tag === "P" ||
        tag === "TD" ||
        tag === "LI" ||
        tag === "SPAN"
      ) {
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

  __cleanText(text) {
    text = text.replace(/[\r\n]+/gm, " ");
    ///remove multiple spaces
    text = text.replace(/\s+/g, " ");
    ///remove '# '
    text = text.replace("# ", "");
    /// Trim leading and trailing spaces
    text = text.replace(/^\s+|\s+$/g, "");
    return text;
  }

  async __sendData(data) {
    await this.sender.add(data);
  }

  __isFileUrl(url) {
    const fileExtensions = [
      ".zip",
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".ppt",
      ".pptx",
      ".rar",
      ".tar",
      ".gz",
      ".tgz",
      ".7z",
      ".bz2",
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".svg",
      ".css",
      ".js",
      ".xml",
      ".txt",
      ".csv",
      ".rtf",
      ".mp3",
      ".wav",
      ".mp4",
      ".avi",
      ".mkv",
      ".mov",
      ".flv",
      ".wmv",
      ".m4v",
      ".ogg",
      ".mpg",
      ".mpeg",
      ".swf",
    ];
    return fileExtensions.some((extension) => url.endsWith(extension));
  }

  __isPaginatedUrl(url) {
    const urlObject = new URL(url);
    const pathname = urlObject.pathname;
    return /\/\d+\//.test(pathname);
  }
}
