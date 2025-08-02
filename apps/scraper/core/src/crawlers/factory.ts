/**
 * Crawler Factory with Dependency Injection support
 */

import { Config, CrawlerType } from '../types'
import { BaseCrawler } from './base'
import { PuppeteerCrawler } from './puppeteer'
import { CheerioCrawler } from './cheerio'
import { PlaywrightCrawler } from './playwright'
import { Sender } from '../sender'
import { Container, SERVICES } from '../container'
import { Log } from '@crawlee/core'

export interface CrawlerFactoryDependencies {
  sender?: Sender
  logger?: Log
  container?: Container
}

/**
 * Factory for creating crawler instances with dependency injection
 */
export class CrawlerFactory {
  private container?: Container
  private logger: Log

  constructor(private dependencies?: CrawlerFactoryDependencies) {
    this.container = dependencies?.container
    this.logger = dependencies?.logger || new Log({ prefix: 'CrawlerFactory' })
  }

  /**
   * Create a crawler instance
   */
  create(
    crawlerType: CrawlerType,
    config: Config,
    launchOptions: Record<string, any> = {}
  ): BaseCrawler {
    const sender = this.getSender(config)
    
    this.logger.info(`Creating ${crawlerType} crawler`)

    switch (crawlerType) {
      case 'puppeteer':
        return new PuppeteerCrawler(sender, config, launchOptions)
      case 'cheerio':
        return new CheerioCrawler(sender, config)
      case 'playwright':
        return new PlaywrightCrawler(sender, config, launchOptions)
      default:
        throw new Error(`Unsupported crawler type: ${crawlerType}`)
    }
  }

  /**
   * Get or create a Sender instance
   */
  private getSender(config: Config): Sender {
    if (this.dependencies?.sender) {
      return this.dependencies.sender
    }

    if (this.container) {
      try {
        return this.container.get<Sender>(SERVICES.SENDER)
      } catch {
        // Fall through to create new instance
      }
    }

    return new Sender(config)
  }

  /**
   * Create a factory with container
   */
  static withContainer(container: Container): CrawlerFactory {
    return new CrawlerFactory({
      container,
      logger: container.get<Log>(SERVICES.LOGGER)
    })
  }
}