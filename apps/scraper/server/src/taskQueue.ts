import Queue, { Job, DoneCallback } from 'bull'
import { fork } from 'child_process'
import { join } from 'path'
import { Config, initMeilisearchClient } from '@scrapix/core'
import { Log } from '@crawlee/core'

const log = new Log({ prefix: 'CrawlTaskQueue' })

export class TaskQueue {
  queue: Queue.Queue

  constructor() {
    log.info('Initializing CrawlTaskQueue', {
      redisUrl: process.env.REDIS_URL,
    })

    const queueName = 'crawling'

    try {
      // Initialize queue with Redis URL if available
      this.queue = process.env.REDIS_URL
        ? new Queue(queueName, process.env.REDIS_URL)
        : new Queue(queueName)

      if (process.env.REDIS_URL) {
        // Set up queue event handlers
        void this.queue.process(this.__process.bind(this))

        const eventHandlers = {
          added: this.__jobAdded,
          completed: this.__jobCompleted,
          failed: this.__jobFailed,
          active: this.__jobActive,
          wait: this.__jobWaiting,
          delayed: this.__jobDelayed,
        }

        // Bind all event handlers
        Object.entries(eventHandlers).forEach(([event, handler]) => {
          this.queue.on(event, handler.bind(this))
        })
      }
    } catch (error) {
      // Fallback to local queue if Redis connection fails
      this.queue = new Queue(queueName)
      log.error('Error while initializing CrawlTaskQueue', {
        error,
        message: (error as Error).message,
      })
    }
  }

  async add(data: Config) {
    log.debug('Adding task to queue', { config: data })
    return await this.queue.add(data)
  }

  async getJob(jobId: string) {
    return await this.queue.getJob(jobId)
  }

  __process(job: Job, done: DoneCallback) {
    log.debug('Processing job', { jobId: job.id })
    const crawlerPath = join(__dirname, 'crawler_process.js')
    const childProcess = fork(crawlerPath)
    childProcess.send(job.data)
    childProcess.on('message', (message) => {
      log.info('Crawler process message', { message })
      done()
    })
    childProcess.on('error', (error) => {
      log.error('Crawler process error', { error })
      done(error)
    })
    childProcess.on('exit', (code) => {
      if (code !== 0) {
        log.error('Crawler process exited with non-zero code', { code })
        done(new Error(`Crawler process exited with code ${code}`))
      }
    })
  }

  __jobAdded(job: Job) {
    log.debug('Job added to queue', { jobId: job.id })
  }

  __jobCompleted(job: Job) {
    log.debug('Job completed', { jobId: job.id })
  }

  async __jobFailed(job: Job<Config>) {
    log.error('Job failed', { jobId: job.id })
    //Create a Meilisearch client
    const client = initMeilisearchClient({
      host: job.data.meilisearch_url,
      apiKey: job.data.meilisearch_api_key,
      clientAgents: job.data.user_agents,
    })

    //check if the tmp index exists
    const tmp_index_uid = job.data.meilisearch_index_uid + '_crawler_tmp'
    try {
      const index = await client.getIndex(tmp_index_uid)
      if (index) {
        const task = await client.deleteIndex(tmp_index_uid)
        await client.waitForTask(task.taskUid)
      }
    } catch (e) {
      log.error('Error while deleting tmp index', { error: e })
    }
  }

  __jobActive(job: Job) {
    log.debug('Job became active', { jobId: job.id })
  }

  __jobWaiting(job: Job) {
    log.debug('Job is waiting', { jobId: job.id })
  }

  __jobDelayed(job: Job) {
    log.debug('Job is delayed', { jobId: job.id })
  }
}
