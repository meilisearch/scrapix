import { createPuppeteerRouter, PuppeteerCrawler } from "crawlee";
import { minimatch } from "minimatch";
import DefaultScraper from "./defaultScraper.js";
import DocsearchScraper from "./docsearchScraper.js";
import CustomScraper from "./customScraper.js";
import SchemaScraper from "./schemaScraper.js";

// Crawler class
// This class is responsible for crawling the urls and extract content to send to Meilisearch
// It uses the createPuppeteerRouter method to create a router that will be used by the PuppeteerCrawler.
// The constructor take a Sender object as a parameter
export default class Crawler {
  constructor(sender, config) {
    this.sender = sender;
    this.config = config;
    this.urls = config.urls;
    this.custom_crawler = config.custom_crawler;
    // init the custome scraper depending on if config.strategy is docsearch, custom or default
    console.log({ ...config });
    console.log("strategy", config.strategy);
    this.scraper =
      config.strategy == "docsearch"
        ? new DocsearchScraper(this.sender, config)
        : config.strategy == "custom"
        ? new CustomScraper(this.sender, config)
        : config.strategy == "schema"
        ? new SchemaScraper(this.sender, config)
        : new DefaultScraper(this.sender, config);

    //Create the router
    let router = createPuppeteerRouter();
    router.addDefaultHandler(this.defaultHandler.bind(this));

    // create the crawler
    this.crawler = new PuppeteerCrawler({
      // proxyConfiguration: new ProxyConfiguration({ proxyUrls: ['...'] }),
      requestHandler: router,
      launchContext: {
        launchOptions: {
          headless: config.headless || true,
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
    log.info(`${title}`, { url: request.loadedUrl });
    const globs = this.urls.map((url) => {
      if (url.endsWith("/")) {
        return url + "**";
      }
      return url + "/**";
    });

    const urls_to_scrap = this.config.index_only_urls || this.urls;
    const scrap_globs = urls_to_scrap.map((url) => {
      if (url.endsWith("/")) {
        return url + "**";
      }
      return url + "/**";
    });

    if (!this.__is_paginated_url(request.loadedUrl)) {
      //check if the url is in the list of urls to scrap
      if (scrap_globs.some((glob) => minimatch(request.loadedUrl, glob))) {
        await this.scraper.get(request.loadedUrl, page);
      }
    }

    await enqueueLinks({
      globs,
      transformRequestFunction: (req) => {
        // exclude all links that are files not parsable by puppeteer
        if (this.__is_file_url(req.url)) {
          return false;
        }
        // remove all query params to avoid duplicates
        const urlObject = new URL(req.url);
        urlObject.search = "";
        req.url = urlObject.toString();

        return req;
      },
    });
  }

  __is_file_url(url) {
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

  __is_paginated_url(url) {
    const urlObject = new URL(url);
    const pathname = urlObject.pathname;
    return /\/\d+\//.test(pathname);
  }
}
