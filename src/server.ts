import * as dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import { TaskQueue } from './taskQueue'
import { Sender } from './sender'
import { Crawler } from './crawler'
import { Config } from './types'

const port = process.env.PORT || 8080

class Server {
  taskQueue: TaskQueue
  app: express.Application

  constructor() {
    this.__check_env()

    this.taskQueue = new TaskQueue()
    this.app = express()
    this.app.use(express.json())
    this.app.post('/crawl', this.__asyncCrawl.bind(this))
    this.app.post('/crawl/async', this.__asyncCrawl.bind(this))
    this.app.post('/crawl/sync', this.__syncCrawl.bind(this))
    this.app.post('/crawl/start', this.__startCrawl.bind(this))
    this.app.post('/webhook', this.__log_webhook.bind(this))

    this.app.listen(port, () =>
      console.log(`Crawler app listening on port ${port}!`)
    )
  }

  __check_env() {
    const { REDIS_URL } = process.env
    console.log('REDIS_URL: ', REDIS_URL)
    if (!REDIS_URL) {
      console.warn('REDIS_URL is not set. Some features may not work properly.')
    }
  }

  __asyncCrawl(req: express.Request, res: express.Response) {
    this.taskQueue.add(req.body)
    console.log('Crawling started')
    res.send('Crawling started')
  }

  async __syncCrawl(req: express.Request, res: express.Response) {
    const config: Config = req.body
    const sender = new Sender(config)
    await sender.init()

    const crawler = new Crawler(
      sender,
      config,
      config.launch_options,
      config.launcher
    )

    await crawler.run()
    await sender.finish()

    res.send('Crawling finished')
  }

  async __startCrawl(req: express.Request, res: express.Response) {
    console.log('Crawling started')
    res.send('Crawling started')

    const config: Config = req.body
    const sender = new Sender(config)
    await sender.init()

    const crawler = new Crawler(
      sender,
      config,
      config.launch_options,
      config.launcher
    )

    await crawler.run()
    await sender.finish()
  }

  __log_webhook(req: express.Request, res: express.Response) {
    console.log('webhook received: ', req.body)
    res.send('ok')
  }
}

new Server()
