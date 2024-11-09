import { Log, RequestQueue } from "crawlee";
import { PuppeteerCrawler } from "./puppeteer";
// import { PlaywrightCrawler } from "./playwright";
import { CheerioCrawler } from "./cheerio";
import { Sender } from "../sender";
import { Config, CrawlerType } from "../types";
import { Webhook } from "../webhook";
import { BaseCrawler } from "./base";

const log = new Log({ prefix: "Crawler" });

export class Crawler {
  static create(
    crawlerType: CrawlerType,
    sender: Sender,
    config: Config,
    launchOptions: Record<string, any> = {}
  ): BaseCrawler {
    log.info(`Creating ${crawlerType} crawler`, { config });
    switch (crawlerType) {
      case "puppeteer":
        return new PuppeteerCrawler(sender, config, launchOptions);
      case "cheerio":
        return new CheerioCrawler(sender, config);
      // case "playwright":
      //   return new PlaywrightCrawler(sender, config, launchOptions);
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
    await requestQueue.addRequests(urls.map((url) => ({ url })));
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
