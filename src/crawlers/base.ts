/* eslint-disable @typescript-eslint/no-unsafe-call */
import { RequestQueue } from "crawlee";
import { minimatch } from "minimatch";
import DefaultScraper from "../scrapers/default";
import DocsearchScraper from "../scrapers/docssearch";
import SchemaScraper from "../scrapers/schema";
import { Sender } from "../sender";
import { Config, Scraper, CrawlerType } from "../types";
import { Webhook } from "../webhook.js";

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

  abstract run(): Promise<void>;

  protected async setupRequestQueue(): Promise<RequestQueue> {
    const requestQueue = await RequestQueue.open(JSON.stringify(this.urls));
    await requestQueue.addRequests(this.urls.map((url) => ({ url })));
    return requestQueue;
  }

  protected handleWebhook(interval: number): NodeJS.Timeout {
    const intervalId = setInterval(async () => {
      await Webhook.get(this.config).active(this.config, {
        nb_page_crawled: this.nb_page_crawled,
        nb_page_indexed: this.nb_page_indexed,
        nb_documents_sent: this.sender.nb_documents_sent,
      });
    }, interval);

    return intervalId;
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
