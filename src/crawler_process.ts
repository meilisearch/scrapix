import { Sender } from './sender.js'
import { Crawler } from './crawler.js'
import { Config } from './types.js'

async function startCrawling(config: Config) {
  const sender = new Sender(config)
  await sender.init()

  const crawler = new Crawler(sender, config)

  await crawler.run()
  await sender.finish()
}

// Listen for messages from the parent thread
process.on('message', async (message: Config) => {
  await startCrawling(message)
  if (process.send) {
    process.send('Crawling finished')
  }
})
