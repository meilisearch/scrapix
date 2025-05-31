import * as dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import { TaskQueue } from './taskQueue'
import { Sender, Crawler, ConfigSchema } from '@scrapix/core'
import { Log } from '@crawlee/core'

const port = process.env.PORT || 8080

const log = new Log({ prefix: 'CrawlerServer' })

class Server {
  taskQueue: TaskQueue
  app: express.Application

  constructor() {
    this.__check_env()

    this.taskQueue = new TaskQueue()
    this.app = express()
    this.app.use(express.json())
    this.app.get('/health', (req, res) => this.__health(req, res))
    this.app.post('/crawl', (req, res) => this.__asyncCrawl(req, res))
    this.app.post('/crawl/async', (req, res) => this.__asyncCrawl(req, res))
    this.app.post('/crawl/sync', (req, res) => this.__syncCrawl(req, res))
    this.app.get('/job/:id/status', (req, res) => this.__jobStatus(req, res))
    this.app.get('/job/:id/events', (req, res) => this.__jobEvents(req, res))
    this.app.post('/webhook', (req, res) => this.__log_webhook(req, res))

    this.app.listen(port, () =>
      log.debug(`Crawler app listening on port ${port}!`)
    )
  }

  __check_env() {
    const { REDIS_URL } = process.env
    log.debug('Checking environment variables', { REDIS_URL })
    if (!REDIS_URL) {
      log.warning('REDIS_URL is not set', {
        message: 'Some features may not work properly',
      })
    }
  }

  __health(req: any, res: any) {
    res.status(200).send({ status: 'ok', uptime: process.uptime() })
  }

  async __asyncCrawl(req: any, res: any) {
    try {
      const config = ConfigSchema.parse(req.body)
      const job = await this.taskQueue.add(config)
      log.info('Asynchronous crawl task added to queue', { config, jobId: job.id })
      res.status(200).send({
        status: 'ok',
        jobId: job.id,
        indexUid: config.meilisearch_index_uid,
        statusUrl: `/job/${job.id}/status`,
        eventsUrl: `/job/${job.id}/events`,
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      log.error('Invalid configuration received', { error })
      res
        .status(400)
        .send({ status: 'error', error: { message: errorMessage } })
    }
  }

  async __syncCrawl(req: any, res: any) {
    try {
      const config = ConfigSchema.parse(req.body)
      log.info('Starting synchronous crawl', { config })
      const sender = new Sender(config)
      await sender.init()

      const crawler = await Crawler.create(config.crawler_type, sender, config)

      await Crawler.run(crawler)
      await sender.finish()

      log.info('Synchronous crawl completed', { config })
      res.status(200).send({
        status: 'ok',
        indexUid: config.meilisearch_index_uid,
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      log.error('Invalid configuration or crawl error', { error })
      res
        .status(400)
        .send({ status: 'error', error: { message: errorMessage } })
    }
  }

  /**
   * Logs the webhook request and sends a response
   *
   * This is an internal endpoint and does not need to be documented.
   */
  async __jobStatus(req: any, res: any) {
    try {
      const jobId = req.params.id
      const job = await this.taskQueue.getJob(jobId)
      
      if (!job) {
        return res.status(404).send({ error: 'Job not found' })
      }

      const status = await job.getState()
      const progress = job.progress()
      
      res.status(200).send({
        jobId: job.id,
        status,
        progress,
        data: job.data,
        createdAt: job.timestamp,
        processedAt: job.processedOn,
        finishedAt: job.finishedOn,
        failedReason: job.failedReason,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      log.error('Error getting job status', { error, jobId: req.params.id })
      res.status(500).send({ error: errorMessage })
    }
  }

  __jobEvents(req: any, res: any) {
    const jobId = req.params.id
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    })

    const sendEvent = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    // Send initial status
    this.taskQueue.getJob(jobId).then(job => {
      if (job) {
        job.getState().then(status => {
          sendEvent({ type: 'status', status, progress: job.progress() })
        })
      } else {
        sendEvent({ type: 'error', message: 'Job not found' })
        res.end()
      }
    })

    // Listen for job updates
    const onJobProgress = (job: any, progress: number) => {
      if (job.id.toString() === jobId) {
        sendEvent({ type: 'progress', progress })
      }
    }

    const onJobCompleted = (job: any, result: any) => {
      if (job.id.toString() === jobId) {
        sendEvent({ type: 'completed', result })
        res.end()
      }
    }

    const onJobFailed = (job: any, error: any) => {
      if (job.id.toString() === jobId) {
        sendEvent({ type: 'failed', error: error.message })
        res.end()
      }
    }

    this.taskQueue.queue.on('progress', onJobProgress)
    this.taskQueue.queue.on('completed', onJobCompleted)
    this.taskQueue.queue.on('failed', onJobFailed)

    // Clean up on client disconnect
    req.on('close', () => {
      this.taskQueue.queue.off('progress', onJobProgress)
      this.taskQueue.queue.off('completed', onJobCompleted)
      this.taskQueue.queue.off('failed', onJobFailed)
    })
  }

  __log_webhook(req: any, res: any) {
    log.info('Webhook received', { body: req.body })
    res.status(200).send({ status: 'ok' })
  }
}

new Server()
