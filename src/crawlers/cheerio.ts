import {
  createCheerioRouter,
  CheerioCrawler as CrawleeCheerioCrawler,
  CheerioCrawlerOptions as CrawleeCheerioCrawlerOptions,
  CheerioHook as CrawleeCheerioHook,
  CheerioCrawlingContext as CrawleeCheerioCrawlingContext,
  Log,
} from "crawlee";
import { BaseCrawler } from "./base";
import { Sender } from "../sender";
import { Config } from "../types";
import { Webhook } from "../webhook.js";

const log = new Log({ prefix: "CheerioCrawler" });

export class CheerioCrawler extends BaseCrawler {
  constructor(sender: Sender, config: Config) {
    super(sender, config);
  }

  async run() {
    log.info("Starting CheerioCrawler run");
    const requestQueue = await this.setupRequestQueue();

    const router = createCheerioRouter();
    router.addDefaultHandler(this.defaultHandler.bind(this));

    const preNavigationHooks: CrawleeCheerioHook[] = this.config
      .additional_request_headers
      ? [
          (crawlingContext) => {
            const { request } = crawlingContext;
            request.headers = {
              ...request.headers,
              ...this.config.additional_request_headers,
            };
          },
        ]
      : [];

    const cheerioCrawlerOptions: CrawleeCheerioCrawlerOptions = {
      requestQueue,
      requestHandler: router,
      preNavigationHooks: preNavigationHooks,
    };

    const crawler = new CrawleeCheerioCrawler(cheerioCrawlerOptions);

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
    log.info("CheerioCrawler run completed", {
      pagesCrawled: this.nb_page_crawled,
      pagesIndexed: this.nb_page_indexed,
    });
  }

  async defaultHandler({
    request,
    enqueueLinks,
    $,
  }: CrawleeCheerioCrawlingContext) {
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
        await this.scraper.get(request.loadedUrl, $ as any);
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
