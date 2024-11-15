import { Log, RequestQueue } from "crawlee";
import { PuppeteerCrawler } from "./puppeteer";
import { CheerioCrawler } from "./cheerio";
import { Sender } from "../sender";
import { Config, CrawlerType } from "../types";
import { Webhook } from "../webhook";
import { BaseCrawler } from "./base";
import { extractUrlsFromSitemap } from "../utils/sitemap";

const log = new Log({ prefix: "Crawler" });

export class Crawler {
  private static config: Config;

  static create(
    crawlerType: CrawlerType,
    sender: Sender,
    config: Config,
    launchOptions: Record<string, any> = {}
  ): BaseCrawler {
    this.config = config;
    log.info(`Creating ${crawlerType} crawler`, { config });
    switch (crawlerType) {
      case "puppeteer":
        return new PuppeteerCrawler(sender, config, launchOptions);
      case "cheerio":
        return new CheerioCrawler(sender, config);
      default:
        throw new Error(`Unsupported crawler type: ${crawlerType}`);
    }
  }

  static async run(crawler: BaseCrawler): Promise<void> {
    log.info(`Starting ${crawler.constructor.name} run`);
    const requestQueue = await Crawler.setupRequestQueue(crawler.urls);

    const router = crawler.createRouter();
    router.addDefaultHandler(crawler.defaultHandler.bind(crawler));

    const crawlerOptions = crawler.getCrawlerOptions(requestQueue, router);
    const crawlerInstance = crawler.createCrawlerInstance(crawlerOptions);

    let interval = 5000;
    if (process.env.WEBHOOK_INTERVAL) {
      interval = parseInt(process.env.WEBHOOK_INTERVAL);
    }

    const intervalId = Crawler.handleWebhook(crawler, interval);

    try {
      await crawlerInstance.run();

      await Webhook.get(crawler.config).active(crawler.config, {
        nb_page_crawled: crawler.nb_page_crawled,
        nb_page_indexed: crawler.nb_page_indexed,
        nb_documents_sent: crawler.sender.nb_documents_sent,
      });
    } catch (err) {
      await Webhook.get(crawler.config).failed(crawler.config, err as Error);
    } finally {
      clearInterval(intervalId);
    }
    await requestQueue.drop();
    log.info(`${crawler.constructor.name} run completed`, {
      pagesCrawled: crawler.nb_page_crawled,
      pagesIndexed: crawler.nb_page_indexed,
    });
  }

  private static async setupRequestQueue(
    urls: string[]
  ): Promise<RequestQueue> {
    const requestQueue = await RequestQueue.open(JSON.stringify(urls));

    if (this.config?.use_sitemap == true) {
      try {
        log.info("Extracting URLs from sitemaps");
        const sitemapUrls = await extractUrlsFromSitemap(
          this.config?.sitemap_urls || urls
        );

        if (sitemapUrls.length > 0) {
          log.info(`Found ${sitemapUrls.length} URLs in sitemaps`);
          await requestQueue.addRequests(sitemapUrls.map((url) => ({ url })));
        } else {
          log.info("No URLs found in sitemaps, falling back to start URLs");
          await requestQueue.addRequests(urls.map((url) => ({ url })));
        }
      } catch (error) {
        log.warning(
          "Failed to extract URLs from sitemaps, falling back to start URLs",
          {
            error: (error as Error).message,
          }
        );
        await requestQueue.addRequests(urls.map((url) => ({ url })));
      }
    } else {
      await requestQueue.addRequests(urls.map((url) => ({ url })));
    }

    return requestQueue;
  }

  private static handleWebhook(
    crawler: BaseCrawler,
    interval: number
  ): NodeJS.Timeout {
    return setInterval(async () => {
      await Webhook.get(crawler.config).active(crawler.config, {
        nb_page_crawled: crawler.nb_page_crawled,
        nb_page_indexed: crawler.nb_page_indexed,
        nb_documents_sent: crawler.sender.nb_documents_sent,
      });
    }, interval);
  }
}
