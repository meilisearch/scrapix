import { Log, RequestQueue } from 'crawlee'
// import { PuppeteerCrawler } from './puppeteer'
// import { CheerioCrawler } from './cheerio'
// import { PlaywrightCrawler } from './playwright'
import { Sender } from '../sender'
import { Config, CrawlerType } from '../types'
import { Webhook } from '../webhook'
import { BaseCrawler } from './base'
import { extractUrlsFromSitemap } from '../utils/sitemap'
import { getConfig } from '../constants'
import { CrawlerFactory } from './factory'
import { Container } from '../container'

const log = new Log({ prefix: 'Crawler' })

/**
 * Factory class for creating and managing web crawlers
 * 
 * @description
 * The Crawler class provides a factory pattern for creating different types
 * of crawlers (Puppeteer, Cheerio, Playwright) and manages their execution
 * lifecycle including request queue setup and webhook handling.
 * 
 * @example
 * ```typescript
 * const sender = new Sender(config);
 * const crawler = Crawler.create('cheerio', sender, config);
 * await Crawler.run(crawler);
 * ```
 */
export class Crawler {
  private static config: Config
  // private static _factory: CrawlerFactory = new CrawlerFactory()

  /**
   * Create a crawler instance based on the specified type
   * 
   * @param {CrawlerType} crawlerType - Type of crawler to create ('puppeteer', 'cheerio', or 'playwright')
   * @param {Sender} sender - Sender instance for document delivery to Meilisearch
   * @param {Config} config - Crawler configuration
   * @param {Record<string, any>} launchOptions - Browser launch options (for Puppeteer/Playwright)
   * @returns {BaseCrawler} The created crawler instance
   * @throws {Error} If an unsupported crawler type is specified
   */
  static create(
    crawlerType: CrawlerType,
    sender: Sender,
    config: Config,
    launchOptions: Record<string, any> = {}
  ): BaseCrawler {
    this.config = config
    // Use factory with injected sender
    const factory = new CrawlerFactory({ sender })
    return factory.create(crawlerType, config, launchOptions)
  }

  /**
   * Create a crawler with dependency injection container
   */
  static createWithContainer(
    crawlerType: CrawlerType,
    config: Config,
    container: Container,
    launchOptions: Record<string, any> = {}
  ): BaseCrawler {
    this.config = config
    const factory = CrawlerFactory.withContainer(container)
    return factory.create(crawlerType, config, launchOptions)
  }

  /**
   * Run a crawler instance
   * 
   * @param {BaseCrawler} crawler - The crawler instance to run
   * 
   * @description
   * Sets up the request queue, creates router handlers, initializes webhooks,
   * and runs the crawler. Handles cleanup and error reporting automatically.
   */
  static async run(crawler: BaseCrawler): Promise<void> {
    log.info(`Starting ${crawler.constructor.name} run`)
    const requestQueue = await Crawler.setupRequestQueue(crawler.urls)

    const router = crawler.createRouter()
    router.addDefaultHandler(crawler.defaultHandler.bind(crawler))

    const crawlerOptions = crawler.getCrawlerOptions(requestQueue, router)
    const crawlerInstance = crawler.createCrawlerInstance(crawlerOptions)

    const interval = getConfig('WEBHOOK', 'DEFAULT_INTERVAL')

    const intervalId = Crawler.handleWebhook(crawler, interval)

    try {
      await crawlerInstance.run()

      await Webhook.get(crawler.config).active(crawler.config, {
        nb_page_crawled: crawler.nb_page_crawled,
        nb_page_indexed: crawler.nb_page_indexed,
        nb_documents_sent: crawler.sender.nb_documents_sent,
      })
    } catch (err) {
      await Webhook.get(crawler.config).failed(crawler.config, err as Error)
    } finally {
      clearInterval(intervalId)
    }
    await requestQueue.drop()
    log.info(`${crawler.constructor.name} run completed`, {
      pagesCrawled: crawler.nb_page_crawled,
      pagesIndexed: crawler.nb_page_indexed,
    })
  }

  private static async setupRequestQueue(
    urls: string[]
  ): Promise<RequestQueue> {
    if (!urls || !Array.isArray(urls)) {
      log.error('Invalid or missing start_urls', { urls })
      throw new Error('start_urls must be an array of strings')
    }

    const requestQueue = await RequestQueue.open('default')

    if (this.config?.use_sitemap == true) {
      try {
        log.info('Extracting URLs from sitemaps')
        const sitemapUrls = await extractUrlsFromSitemap(
          this.config?.sitemap_urls || urls
        )

        if (sitemapUrls.length > 0) {
          log.info(`Found ${sitemapUrls.length} URLs in sitemaps`)
          await requestQueue.addRequests(sitemapUrls.map((url) => ({ url })))
        } else {
          log.info('No URLs found in sitemaps, falling back to start URLs')
          await requestQueue.addRequests(urls.map((url) => ({ url })))
        }
      } catch (error) {
        log.warning(
          'Failed to extract URLs from sitemaps, falling back to start URLs',
          {
            error: (error as Error).message,
          }
        )
        await requestQueue.addRequests(urls.map((url) => ({ url })))
      }
    } else {
      await requestQueue.addRequests(urls.map((url) => ({ url })))
    }

    return requestQueue
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
      })
    }, interval)
  }
}
