import * as dotenv from 'dotenv'
dotenv.config()

import { TaskQueue } from './taskQueue'
import { Log } from '@crawlee/core'

const log = new Log({ prefix: 'CrawlerWorker' })

class Worker {
  taskQueue: TaskQueue

  constructor() {
    this.__check_env()
    
    log.info('Starting Crawler Worker')
    this.taskQueue = new TaskQueue()
    
    // Keep the process alive
    process.on('SIGTERM', () => {
      log.info('Worker received SIGTERM, shutting down gracefully')
      process.exit(0)
    })
    
    process.on('SIGINT', () => {
      log.info('Worker received SIGINT, shutting down gracefully')
      process.exit(0)
    })
    
    log.info('Crawler Worker started and listening for jobs')
  }

  __check_env() {
    const { REDIS_URL } = process.env
    log.debug('Checking environment variables', { REDIS_URL })
    if (!REDIS_URL) {
      log.error('REDIS_URL is not set', {
        message: 'Worker requires Redis to function',
      })
      process.exit(1)
    }
  }
}

new Worker()