/* eslint-disable @typescript-eslint/no-unsafe-call */
import { RequestQueue, Router } from "crawlee";
import { minimatch } from "minimatch";
import DefaultScraper from "../scrapers/default";
import DocsearchScraper from "../scrapers/docssearch";
import SchemaScraper from "../scrapers/schema";
import { Sender } from "../sender";
import { Config, Scraper, CrawlerType } from "../types";
import { Log } from "crawlee";
import * as cheerio from "cheerio";

const log = new Log({ prefix: "BaseCrawler" });

export abstract class BaseCrawler {
  sender: Sender;
  config: Config;
  urls: string[];
  scraper: Scraper;
  nb_page_crawled = 0;
  nb_page_indexed = 0;
  crawlerType: CrawlerType;

  constructor(sender: Sender, config: Config) {
    this.sender = sender;
    this.config = config;
    this.urls = config.start_urls;
    this.crawlerType = config.crawler_type || "puppeteer";

    this.scraper =
      this.config.strategy == "docssearch"
        ? new DocsearchScraper(this.sender, this.config)
        : this.config.strategy == "schema"
          ? new SchemaScraper(this.sender, this.config)
          : new DefaultScraper(this.sender, this.config);
  }

  abstract createRouter(): Router<any>;
  abstract getCrawlerOptions(
    requestQueue: RequestQueue,
    router: Router<any>
  ): any;
  abstract createCrawlerInstance(options: any): any;

  // Add this new method
  async defaultHandler(context: any): Promise<void> {
    await this.handlePage(context);
  }

  // New method to handle the common logic
  protected async handlePage(context: any): Promise<void> {
    const { request, enqueueLinks } = context;
    this.nb_page_crawled++;
    log.debug("Processing page", { url: request.loadedUrl });

    const crawled_globs = this.__generate_globs(this.urls);
    const excluded_crawled_globs = this.__generate_globs(
      this.config.urls_to_exclude || []
    );
    const indexed_globs = this.__generate_globs(
      this.config.urls_to_index || this.urls
    );
    const excluded_indexed_globs = this.__generate_globs(
      this.config.urls_to_not_index || []
    );

    if (request.loadedUrl && !this.__is_paginated_url(request.loadedUrl)) {
      if (
        this.__match_globs(request.loadedUrl, indexed_globs) &&
        !this.__match_globs(request.loadedUrl, excluded_indexed_globs)
      ) {
        this.nb_page_indexed++;
        // Convert Puppeteer page to Cheerio instance
        let $: cheerio.CheerioAPI;
        if (this.crawlerType === "puppeteer") {
          const pageContent = await context.page.content(); // Get HTML content from Puppeteer page
          $ = cheerio.load(pageContent); // Load HTML into Cheerio
        } else {
          $ = context.$; // Use Cheerio context if not Puppeteer
        }

        if ($) {
          await this.scraper.get(request.loadedUrl, $);
        } else {
          log.warning("Cheerio context is undefined, skipping scraper.get");
        }
      }
    }

    await enqueueLinks({
      globs: crawled_globs,
      exclude: excluded_crawled_globs,
      transformRequestFunction: (req: any) => {
        if (this.__is_file_url(req.url)) {
          return false;
        }
        const urlObject = new URL(req.url);
        urlObject.search = "";
        urlObject.hash = "";
        req.url = urlObject.toString();
        return req;
      },
    });
  }

  protected __generate_globs(urls: string[]): string[] {
    return urls.flatMap((url) => {
      if (url.endsWith("/")) {
        return [url, url + "**"];
      }
      return [url, url + "/**"];
    });
  }

  protected __match_globs(url: string, globs: string[]): boolean {
    return globs.some((glob) => minimatch(url, glob));
  }

  protected __is_file_url(url: string): boolean {
    // Add more file extensions to check for
    const fileExtensions = [
      ".json",
      ".csv",
      ".yaml",
      ".yml",
      ".md",
      ".markdown",
      ".ini",
      ".config",
      ".log",
      ".sql",
      ".db",
      ".sqlite",
      ".exe",
      ".bin",
      ".iso",
      ".dmg",
      ".apk",
      ".ipa",
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

  protected __is_paginated_url(url: string) {
    const urlObject = new URL(url);
    const pathname = urlObject.pathname;
    return /\/\d+\//.test(pathname);
  }
}
