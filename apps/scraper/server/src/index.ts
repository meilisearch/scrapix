import * as dotenv from 'dotenv'
dotenv.config()

import express, { Request, Response, NextFunction } from 'express'
import rateLimit from 'express-rate-limit'
import { TaskQueue } from './taskQueue'
import { Sender, Crawler, ConfigSchema, ScrapixError, ErrorCode, logError, getConfig, Container, closeConnectionPools } from '@scrapix/core'
import { Log } from '@crawlee/core'
import { z } from 'zod'

const port = getConfig('SERVER', 'DEFAULT_PORT')

const log = new Log({ prefix: 'CrawlerServer' })

// Validation schemas
// const JobIdSchema = z.object({
//   id: z.string().regex(/^\d+$/, 'Job ID must be a number'),
// })

// Rate limiting configurations
const createCrawlLimiter = rateLimit({
  windowMs: getConfig('RATE_LIMIT', 'WINDOW_MS'),
  max: getConfig('RATE_LIMIT', 'CRAWL_MAX_REQUESTS'),
  message: 'Too many crawl requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

const jobStatusLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: getConfig('RATE_LIMIT', 'STATUS_MAX_REQUESTS'),
  message: 'Too many status requests from this IP, please try again later.',
})

const globalLimiter = rateLimit({
  windowMs: getConfig('RATE_LIMIT', 'WINDOW_MS'),
  max: getConfig('RATE_LIMIT', 'GLOBAL_MAX_REQUESTS'),
  message: 'Too many requests from this IP, please try again later.',
})

// Error handler middleware
const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  const formatted = logError('UnhandledError', err, { path: req.path, method: req.method })
  
  const statusCode = err instanceof ScrapixError ? err.statusCode : 500
  
  res.status(statusCode).json({
    status: 'error',
    error: {
      code: formatted.code,
      message: formatted.message,
      ...(process.env.NODE_ENV !== 'production' && { details: formatted.details }),
    },
  })
}

// Request validation middleware
const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          status: 'error',
          error: {
            message: 'Invalid request body',
            details: error.errors,
          },
        })
      } else {
        next(error)
      }
    }
  }
}

class Server {
  taskQueue: TaskQueue
  app: express.Application

  constructor() {
    this.__check_env()

    this.taskQueue = new TaskQueue()
    this.app = express()
    
    // Middleware
    this.app.use(express.json({ limit: getConfig('SERVER', 'MAX_BODY_SIZE') }))
    this.app.use(globalLimiter) // Apply global rate limit to all routes
    this.app.use((req, _res, next) => {
      log.debug('Request received', { method: req.method, path: req.path })
      next()
    })

    // Routes
    this.app.get('/health', (req, res) => this.__health(req, res))
    this.app.post('/crawl', createCrawlLimiter, validateBody(ConfigSchema), (req, res) => this.__asyncCrawl(req, res))
    this.app.post('/crawl/async', createCrawlLimiter, validateBody(ConfigSchema), (req, res) => this.__asyncCrawl(req, res))
    this.app.post('/crawl/sync', createCrawlLimiter, validateBody(ConfigSchema), (req, res) => this.__syncCrawl(req, res))
    this.app.get('/job/:id/status', jobStatusLimiter, (req: Request<{ id: string }>, res) => this.__jobStatus(req, res))
    this.app.get('/job/:id/events', jobStatusLimiter, (req: Request<{ id: string }>, res) => this.__jobEvents(req, res))
    this.app.post('/webhook', (req, res) => this.__log_webhook(req, res))

    // Error handler (must be last)
    this.app.use(errorHandler)

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

  __health(_req: Request, res: Response) {
    res.status(200).send({ status: 'ok', uptime: process.uptime() })
  }

  async __asyncCrawl(req: Request, res: Response) {
    try {
      const config = req.body // Already validated by middleware
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
      if (error instanceof z.ZodError) {
        res.status(400).json({
          status: 'error',
          error: {
            code: ErrorCode.CONFIG_INVALID,
            message: 'Invalid crawler configuration',
            details: error.errors,
          },
        })
      } else {
        const formatted = logError('AsyncCrawl', error)
        res.status(500).json({
          status: 'error',
          error: formatted,
        })
      }
    }
  }

  async __syncCrawl(req: Request, res: Response) {
    try {
      const config = req.body // Already validated by middleware
      log.info('Starting synchronous crawl', { config })
      
      // Create container for dependency injection
      // const container = Container.createDefault(config)
      Container.createDefault(config)
      
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
      if (error instanceof z.ZodError) {
        res.status(400).json({
          status: 'error',
          error: {
            code: ErrorCode.CONFIG_INVALID,
            message: 'Invalid crawler configuration',
            details: error.errors,
          },
        })
      } else {
        const formatted = logError('SyncCrawl', error)
        res.status(500).json({
          status: 'error',
          error: formatted,
        })
      }
    }
  }

  /**
   * Logs the webhook request and sends a response
   *
   * This is an internal endpoint and does not need to be documented.
   */
  async __jobStatus(req: Request<{ id: string }>, res: Response): Promise<void> {
    try {
      const jobId = req.params.id
      
      // Validate job ID format
      if (!jobId || !/^\d+$/.test(jobId)) {
        res.status(400).send({ error: 'Invalid job ID format' })
        return
      }
      const job = await this.taskQueue.getJob(jobId)
      
      if (!job) {
        throw new ScrapixError(
          ErrorCode.JOB_NOT_FOUND,
          `Job with ID ${jobId} not found. It may have expired or been deleted.`,
          { jobId },
          404
        )
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
      if (error instanceof ScrapixError) {
        res.status(error.statusCode).json(error.toJSON())
      } else {
        const formatted = logError('JobStatus', error, { jobId: req.params.id })
        res.status(500).json({
          status: 'error',
          error: formatted,
        })
      }
    }
  }

  __jobEvents(req: Request<{ id: string }>, res: Response) {
    const jobId = req.params.id
    
    // Validate job ID format
    if (!jobId || !/^\d+$/.test(jobId)) {
      res.status(400).send({ error: 'Invalid job ID format' })
      return
    }
    
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

  __log_webhook(req: Request, res: Response) {
    log.info('Webhook received', { body: req.body })
    res.status(200).send({ status: 'ok' })
  }
}

// const server = new Server()
new Server()

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  log.info(`Received ${signal}, shutting down gracefully...`)
  
  try {
    // Close connection pools
    closeConnectionPools()
    log.info('Connection pools closed')
    
    // Give ongoing requests a chance to complete
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    process.exit(0)
  } catch (error) {
    log.error('Error during shutdown', { error })
    process.exit(1)
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
