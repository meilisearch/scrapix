import { PuppeteerCrawler } from './puppeteer'
import { CheerioCrawler } from './cheerio'
import { Sender } from '../sender'
import { Config, CrawlerType } from '../types'
import { PuppeteerNode } from 'puppeteer-core'

export class Crawler {
  static create(
    crawlerType: CrawlerType,
    sender: Sender,
    config: Config,
    launchOptions: Record<string, any> = {},
    launcher?: PuppeteerNode
  ) {
    switch (crawlerType) {
      case 'puppeteer':
        return new PuppeteerCrawler(sender, config, launchOptions, launcher)
      case 'cheerio':
        return new CheerioCrawler(sender, config)
      // case 'playwright':
      //   return new PlaywrightCrawler(sender, config, launchOptions)
      default:
        throw new Error(`Unsupported crawler type: ${crawlerType}`)
    }
  }
}
