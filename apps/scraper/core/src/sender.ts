import { MeiliSearch, Settings } from 'meilisearch'
import { Config, DocumentType } from './types'
import { initMeilisearchClient } from './utils/meilisearch_client'
import { Webhook } from './webhook'
import { Log } from '@crawlee/core'
import { ScrapixError, ErrorCode } from './utils/error_handler'
import { getConfig } from './constants'

const log = new Log({ prefix: 'MeilisearchSender' })

/**
 * Handles document batching and sending to Meilisearch
 * 
 * The Sender class manages a queue of documents and efficiently batches them
 * for indexing in Meilisearch. It handles retries, error recovery, and
 * webhook notifications.
 * 
 * @example
 * ```typescript
 * const sender = new Sender(config);
 * await sender.init();
 * await sender.add({ url: 'https://example.com', title: 'Example' });
 * await sender.finish();
 * ```
 */
export interface SenderDependencies {
  client?: MeiliSearch
  webhook?: Webhook
}

export class Sender {
  config: Config
  queue: DocumentType[] = []
  initial_index_uid: string
  index_uid: string
  batch_size: number
  client: MeiliSearch
  nb_documents_sent = 0
  pendingTasks?: number[]
  retryCount?: number
  private webhook: Webhook

  constructor(config: Config, dependencies?: SenderDependencies) {
    log.info('Initializing MeilisearchSender', { config })
    this.config = config
    this.initial_index_uid = config.meilisearch_index_uid
    this.index_uid = this.initial_index_uid
    this.batch_size = config.batch_size || 1000

    //Create a Meilisearch client
    this.client = dependencies?.client || initMeilisearchClient({
      host: config.meilisearch_url,
      apiKey: config.meilisearch_api_key,
      clientAgents: config.user_agents,
    })
    
    //Initialize webhook
    this.webhook = dependencies?.webhook || Webhook.get(config)
  }

  /**
   * Initialize the Sender - prepares the Meilisearch index for document ingestion
   * 
   * @description
   * If the index does not exist, it will be created.
   * If the index exists, it will create a temporary index and swap it with the existing one
   * after crawling is complete to ensure atomic updates.
   * 
   * @throws {ScrapixError} If initialization fails or Meilisearch connection cannot be established
   * 
   * @example
   * ```typescript
   * const sender = new Sender(config);
   * await sender.init();
   * ```
   */
  async init() {
    log.debug('Starting Sender initialization')
    try {
      await this.webhook.started(this.config)

      // Validate required config
      if (!this.initial_index_uid) {
        throw new Error('Meilisearch index UID is required')
      }

      let existingSettings = null
      let indexExists = false

      try {
        const index = await this.client.getIndex(this.initial_index_uid)
        log.debug('Index exists', { indexUid: this.initial_index_uid })
        if (index) {
          indexExists = true
          if (this.config.keep_settings !== false) {
            try {
              existingSettings = await index.getSettings()
            } catch (err) {
              log.warning('Failed to retrieve existing settings', {
                error: err,
              })
            }
          }
        }
      } catch (_err) {
        // Index doesn't exist, we'll create it
        log.debug('Index does not exist, will create new one', {
          indexUid: this.initial_index_uid,
        })
      }

      // If index exists, create temporary index
      if (indexExists) {
        this.index_uid = `${this.initial_index_uid}_crawler_tmp`

        try {
          // Check if temp index exists and delete if needed
          const tmp_index = await this.client.getIndex(this.index_uid)
          if (tmp_index) {
            const deleteTask = await this.client.deleteIndex(this.index_uid)
            await this.client.waitForTask(deleteTask.taskUid)
          }
        } catch (err) {
          // Temp index doesn't exist, which is fine
        }
      }

      // Create the index (either temp or initial)
      try {
        const createTask = await this.client.createIndex(this.index_uid, {
          primaryKey: this.config.primary_key || 'uid',
        })
        await this.client.waitForTask(createTask.taskUid)

        // Apply existing settings if needed
        if (existingSettings && this.config.keep_settings !== false) {
          log.info('Applying kept settings to index', {
            indexUid: this.index_uid,
          })
          const settingsTask = await this.client
            .index(this.index_uid)
            .updateSettings(existingSettings)
          await this.client.waitForTask(settingsTask.taskUid)
        }

        log.info('Sender initialization completed', {
          indexUid: this.index_uid,
        })
      } catch (err) {
        throw new Error(
          `Failed to create index: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    } catch (err) {
      throw new ScrapixError(
        ErrorCode.SENDER_INIT_FAILED,
        `Failed to initialize Meilisearch sender: ${err instanceof Error ? err.message : 'Unknown error'}`,
        { 
          indexUid: this.initial_index_uid,
          meilisearchUrl: this.config.meilisearch_url,
          error: err
        }
      )
    }
  }

  /**
   * Add a document to the queue for batch processing
   * 
   * @param {DocumentType} data - The document to be indexed in Meilisearch
   * 
   * @description
   * Documents are queued and sent in batches for efficiency. When the queue
   * reaches the configured batch_size, documents are automatically sent to
   * Meilisearch asynchronously.
   * 
   * @example
   * ```typescript
   * await sender.add({
   *   uid: 'doc-123',
   *   url: 'https://example.com',
   *   title: 'Example Page',
   *   content: 'Page content...'
   * });
   * ```
   */
  async add(data: DocumentType) {
    this.nb_documents_sent++
    if (!data.uid) {
      log.warning('Document without uid', { data })
    }

    if (this.config.primary_key && this.config.primary_key !== 'uid') {
      delete data['uid']
    }

    if (this.batch_size) {
      this.queue.push(data)
      if (this.queue.length >= this.batch_size) {
        // Don't await here to avoid blocking document processing
        this.__batchSend().catch((error: any) => {
          log.error('Batch send failed in add()', { error })
        })
        // Note: queue is now cleared inside __batchSend after successful submission
        // Reset retry count for next batch
        this.retryCount = 0
      }
    } else {
      await this.client.index(this.index_uid).addDocuments([data])
    }
    log.debug('Adding document to queue', { uid: data.uid })
  }

  /**
   * Update Meilisearch index settings
   * 
   * @param {Settings} settings - The Meilisearch settings to apply
   * 
   * @description
   * Updates settings for the current index. If keep_settings is enabled,
   * existing settings from the original index are preserved.
   * 
   * @throws {Error} If settings update fails
   * 
   * @example
   * ```typescript
   * await sender.updateSettings({
   *   searchableAttributes: ['title', 'content'],
   *   filterableAttributes: ['url', 'domain']
   * });
   * ```
   */
  async updateSettings(settings: Settings) {
    try {
      // Check if original index exists and we want to keep settings
      if (this.config.keep_settings && this.initial_index_uid) {
        try {
          // Try to get existing settings from original index
          const existingSettings = await this.client
            .index(this.initial_index_uid)
            .getSettings()

          log.debug('Copying existing settings to temporary index')
          const task = await this.client
            .index(this.index_uid)
            .updateSettings(existingSettings)
          await this.client.waitForTask(task.taskUid)
          return
        } catch (error) {
          // If original index doesn't exist, fall through to applying new settings
          log.debug('Original index not found, will apply new settings')
        }
      }

      // Apply new settings if keep_settings is false or original index doesn't exist
      log.debug('Updating Meilisearch index settings')
      const task = await this.client
        .index(this.index_uid)
        .updateSettings(settings)
      await this.client.waitForTask(task.taskUid)
    } catch (error) {
      log.error('Failed to update settings', { error })
      throw error
    }
  }

  /**
   * Finalize the indexing process
   * 
   * @description
   * Sends any remaining documents in the queue, waits for all pending tasks
   * to complete, and performs index swapping if using a temporary index.
   * This method must be called after all documents have been added.
   * 
   * @example
   * ```typescript
   * // After crawling is complete
   * await sender.finish();
   * ```
   */
  async finish() {
    log.debug('Starting Sender finish process')
    
    // Send any remaining documents synchronously
    if (this.queue.length > 0) {
      log.info(`Sending remaining ${this.queue.length} documents`)
      await this.__batchSendSync()
    }
    
    // Wait for all pending async tasks to complete
    if (this.pendingTasks && this.pendingTasks.length > 0) {
      log.info(`Waiting for ${this.pendingTasks.length} pending tasks to complete`)
      try {
        await Promise.all(
          this.pendingTasks.map(taskUid => 
            this.client.waitForTask(taskUid, { timeOutMs: 30000 })
          )
        )
      } catch (error) {
        log.error('Error waiting for pending tasks', { error })
      }
    }
    
    const index = await this.client.getIndex(this.index_uid)
    const stats = await index.getStats()
    if (
      this.index_uid !== this.initial_index_uid &&
      stats.numberOfDocuments > 0
    ) {
      await this.__swapIndex()
    } else if (this.index_uid !== this.initial_index_uid) {
      const task = await this.client.deleteIndex(this.index_uid)
      await this.client.index(this.index_uid).waitForTask(task.taskUid)
    }

    await this.webhook.completed(
      this.config,
      this.nb_documents_sent
    )
    log.info('Sender finish process completed', {
      documentsSent: this.nb_documents_sent,
    })
  }

  async __batchSend(): Promise<void> {
    log.debug('Batch sending documents', { queueSize: this.queue.length })
    try {
      const task = await this.client
        .index(this.index_uid)
        .addDocuments(this.queue)
      
      // Store task ID for tracking
      if (!this.pendingTasks) {
        this.pendingTasks = []
      }
      this.pendingTasks.push(task.taskUid)
      
      // Clear the queue after successful submission
      this.queue = []
    } catch (error) {
      log.error('Error while sending data to MeiliSearch', { 
        error,
        queueSize: this.queue.length,
        indexUid: this.index_uid 
      })
      
      // Implement retry logic
      if (!this.retryCount) {
        this.retryCount = 0
      }
      
      this.retryCount++
      if (this.retryCount <= getConfig('RETRY', 'MAX_ATTEMPTS')) {
        log.info(`Retrying batch send (attempt ${this.retryCount}/${getConfig('RETRY', 'MAX_ATTEMPTS')})`)
        // Wait before retrying (exponential backoff)
        const delay = Math.min(
          getConfig('RETRY', 'BASE_DELAY') * Math.pow(2, this.retryCount - 1),
          getConfig('RETRY', 'MAX_DELAY')
        )
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.__batchSend()
      } else {
        // After max retries, throw a specific error
        throw new ScrapixError(
          ErrorCode.SENDER_BATCH_FAILED,
          `Failed to send ${this.queue.length} documents to Meilisearch after ${getConfig('RETRY', 'MAX_ATTEMPTS')} retry attempts`,
          {
            queueSize: this.queue.length,
            indexUid: this.index_uid,
            lastError: error,
            suggestion: 'Check Meilisearch server status and network connectivity'
          }
        )
      }
    }
  }

  async __batchSendSync() {
    log.debug('Synchronous batch sending of documents', {
      queueSize: this.queue.length,
    })
    
    if (this.queue.length === 0) {
      return
    }
    
    try {
      const task = await this.client
        .index(this.index_uid)
        .addDocuments(this.queue)
      await this.client.waitForTask(task.taskUid, { timeOutMs: 15000 })
      
      // Update count and clear queue after successful send
      this.nb_documents_sent += this.queue.length
      this.queue = []
    } catch (error) {
      log.error('Error in synchronous batch send', {
        error,
        queueSize: this.queue.length,
        indexUid: this.index_uid
      })
      throw error
    }
  }

  async __swapIndex() {
    log.debug('Swapping Meilisearch indexes')
    await this.client.swapIndexes([
      { indexes: [this.initial_index_uid, this.index_uid] },
    ])
    const task = await this.client.deleteIndex(this.index_uid)
    await this.client.index(this.index_uid).waitForTask(task.taskUid)
  }
}
