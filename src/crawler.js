import { createPuppeteerRouter, PuppeteerCrawler } from "crawlee";
import { minimatch } from "minimatch";
import DefaultScraper from "./scrapers/default.js";
import DocsearchScraper from "./scrapers/docsearch.js";
import CustomScraper from "./scrapers/custom.js";
import SchemaScraper from "./scrapers/schema.js";

// Crawler class
// This class is responsible for crawling the urls and extract content to send to Meilisearch
// It uses the createPuppeteerRouter method to create a router that will be used by the PuppeteerCrawler.
// The constructor take a Sender object as a parameter
export default class Crawler {
  constructor(sender, config) {
    console.info("Crawler::constructor");
    this.sender = sender;
    this.config = config;
    this.urls = config.crawled_urls;
    this.custom_crawler = config.custom_crawler;
    // init the custome scraper depending on if config.strategy is docsearch, custom or default
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
    console.log(`${title}`, { url: request.loadedUrl });
    const crawled_globs = this.__generate_globs(this.urls);
    const excluded_crawled_globs = this.__generate_globs(
      this.config.exclude_crawled_urls || []
    );
    const indexed_globs = this.__generate_globs(
      this.config.indexed_urls || this.urls
    );
    const excluded_indexed_globs = this.__generate_globs(
      this.config.exclude_indexed_urls || []
    );

    if (!this.__is_paginated_url(request.loadedUrl)) {
      //check if the url is in the list of urls to scrap
      if (
        this.__match_globs(request.loadedUrl, indexed_globs) &&
        !this.__match_globs(request.loadedUrl, excluded_indexed_globs)
      ) {
        await this.scraper.get(request.loadedUrl, page);
      }
    }

    await enqueueLinks({
      globs: crawled_globs,
      exclude: excluded_crawled_globs,
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

  __generate_globs(urls) {
    return urls.map((url) => {
      if (url.endsWith("/")) {
        return url + "**";
      }
      return url + "/**";
    });
  }

  __match_globs(url, globs) {
    return globs.some((glob) => minimatch(url, glob));
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
