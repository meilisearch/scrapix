import {
  createPuppeteerRouter,
  PuppeteerCrawler as CrawleePuppeteerCrawler,
  PuppeteerCrawlerOptions as CrawleePuppeteerCrawlerOptions,
  PuppeteerHook as CrawleePuppeteerHook,
  PuppeteerCrawlingContext as CrawleePuppeteerCrawlingContext,
  Log,
} from "crawlee";
import { PuppeteerNode } from "puppeteer-core";
import { load } from "cheerio";
import { BaseCrawler } from "./base";
import { Sender } from "../sender";
import { Config } from "../types";
import { Webhook } from "../webhook.js";

const log = new Log({ prefix: "PuppeteerCrawler" });

export class PuppeteerCrawler extends BaseCrawler {
  launchOptions: Record<string, any> = {};
  launcher?: PuppeteerNode;

  constructor(
    sender: Sender,
    config: Config,
    launchOptions: Record<string, any> = {},
    launcher?: PuppeteerNode
  ) {
    super(sender, config);
    this.launchOptions = launchOptions;
    this.launcher = launcher;
  }

  async run() {
    log.info("Starting PuppeteerCrawler run");
    const requestQueue = await this.setupRequestQueue();

    const router = createPuppeteerRouter();
    router.addDefaultHandler(this.defaultHandler.bind(this));

    const preNavigationHooks: CrawleePuppeteerHook[] = this.config
      .additional_request_headers
      ? [
          async (crawlingContext) => {
            await crawlingContext.addInterceptRequestHandler(
              async (request) => {
                return await request.continue({
                  headers: {
                    ...request.headers(),
                    ...this.config.additional_request_headers,
                  },
                });
              }
            );
          },
        ]
      : [];

    const puppeteerCrawlerOptions: CrawleePuppeteerCrawlerOptions = {
      requestQueue,
      requestHandler: router,
      preNavigationHooks: preNavigationHooks,
      launchContext: {
        launchOptions: {
          headless: this.config.headless || true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
          ignoreDefaultArgs: ["--disable-extensions"],
          ...this.launchOptions,
        },
        launcher: this.launcher,
      },
    };

    const crawler = new CrawleePuppeteerCrawler(puppeteerCrawlerOptions);

    let interval = 5000;
    if (process.env.WEBHOOK_INTERVAL) {
      interval = parseInt(process.env.WEBHOOK_INTERVAL);
    }

    const intervalId = this.handleWebhook(interval);

    try {
      await crawler.run();

      await Webhook.get(this.config).active(this.config, {
        nb_page_crawled: this.nb_page_crawled,
        nb_page_indexed: this.nb_page_indexed,
        nb_documents_sent: this.sender.nb_documents_sent,
      });
    } catch (err) {
      await Webhook.get(this.config).failed(this.config, err as Error);
    } finally {
      clearInterval(intervalId);
    }
    await requestQueue.drop();
    log.info("PuppeteerCrawler run completed", {
      pagesCrawled: this.nb_page_crawled,
      pagesIndexed: this.nb_page_indexed,
    });
  }

  async defaultHandler({
    request,
    enqueueLinks,
    page,
  }: CrawleePuppeteerCrawlingContext) {
    this.nb_page_crawled++;
    log.debug("Processing page", { url: request.loadedUrl });

    const content = await page.content();
    const $ = load(content);

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
        await this.scraper.get(request.loadedUrl, $);
      }
    }

    await enqueueLinks({
      globs: crawled_globs,
      exclude: excluded_crawled_globs,
      transformRequestFunction: (req) => {
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
}
