import { Sender } from './sender.js'
import Crawler from './crawler.js'
import { Config } from './types.js'
import { Webhook } from './webhook.js'

async function startCrawling(config: Config) {
  await Webhook.get().started(config)
  const sender = new Sender(config)
  await sender.init()

  const crawler = new Crawler(sender, config)

  await crawler.run()
  await sender.finish()
  await Webhook.get().completed(config)
}

// Listen for messages from the parent thread
process.on('message', async (message: Config) => {
  await startCrawling(message)
  if (process.send) {
    process.send('Crawling finished')
  }
})
