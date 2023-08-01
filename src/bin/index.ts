import * as dotenv from 'dotenv'
dotenv.config()

import fs from 'fs'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { Sender } from '../sender'
import { Crawler } from '../crawler'
import { Config } from '../types'

// eslint-disable-next-line @typescript-eslint/no-floating-promises
;(async () => {
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

  const sender = new Sender(config)
  await sender.init()

  const crawler = new Crawler(sender, config)

  await crawler.run()
  await sender.finish()
})()
