import * as dotenv from 'dotenv'
dotenv.config()

import fs from 'fs'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import Crawler from './crawler.js'
import { Sender } from './sender.js'
import { Config } from './types.js'
import { Webhook } from './webhook.js'

// Parse command line arguments and get a configuration file path
const argv = await yargs(hideBin(process.argv)).option('config', {
  alias: 'c',
  describe: 'Path to configuration file',
  demandOption: true,
  type: 'string',
}).argv

const config: Config = JSON.parse(
  fs.readFileSync(argv.config, { encoding: 'utf-8' })
) as Config

await Webhook.get().started(config)

const sender = new Sender(config)
await sender.init()

const crawler = new Crawler(sender, config)

await crawler.run()
await sender.finish()
await Webhook.get().completed(config)
