import { MeiliSearch, Settings } from 'meilisearch'
import { Config, DocumentType } from './types'
import { initMeilisearchClient } from './meilisearch_client'
import { Webhook } from './webhook'

//Create a class called Sender that will queue the json data and batch it to a Meilisearch instance
export class Sender {
  config: Config
  queue: DocumentType[] = []
  initial_index_uid: string
  index_uid: string
  batch_size: number
  client: MeiliSearch
  nb_documents_sent = 0

  constructor(config: Config) {
    console.info('Sender::constructor')
    this.config = config
    this.initial_index_uid = config.meilisearch_index_uid
    this.index_uid = this.initial_index_uid
    this.batch_size = config.batch_size || 1000

    //Create a Meilisearch client
    this.client = initMeilisearchClient({
      host: config.meilisearch_url,
      apiKey: config.meilisearch_api_key,
      clientAgents: config.user_agents,
    })
  }

  async init() {
    console.log('Sender::init')
    try {
      await Webhook.get(this.config).started(this.config)
      const index = await this.client.getIndex(this.initial_index_uid)

      if (index) {
        this.index_uid = this.initial_index_uid + '_crawler_tmp'

        const tmp_index = await this.client.getIndex(this.index_uid)
        if (tmp_index) {
          const task = await this.client.deleteIndex(this.index_uid)
          await this.client.waitForTask(task.taskUid)
        }
      }

      await this.client.createIndex(this.index_uid, {
        primaryKey: this.config.primary_key || 'uid',
      })
    } catch (e) {
      console.log('try to delete a tmp index if it exists')
    }
  }

  //Add a json object to the queue
  async add(data: DocumentType) {
    this.nb_documents_sent++

    if (this.config.primary_key && this.config.primary_key !== 'uid') {
      delete data['uid']
    }

    if (this.batch_size) {
      this.queue.push(data)
      if (this.queue.length >= this.batch_size) {
        this.__batchSend()
        this.queue = []
      }
    } else {
      await this.client.index(this.index_uid).addDocuments([data])
    }
  }

  async updateSettings(settings: Settings) {
    console.log('Sender::updateSettings')
    const task = await this.client
      .index(this.index_uid)
      .updateSettings(settings)
    await this.client.waitForTask(task.taskUid)
  }

  async finish() {
    await this.__batchSendSync()
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

    await Webhook.get(this.config).completed(
      this.config,
      this.nb_documents_sent
    )
    console.log('Sender::Finish')
  }

  __batchSend() {
    console.log(`Sender::__batchSend - size: ${this.queue.length}`)
    this.client
      .index(this.index_uid)
      .addDocuments(this.queue)
      .catch((e) => {
        console.log(e)
        console.log('Error while sending data to MeiliSearch')
      })
  }

  async __batchSendSync() {
    console.log(`Sender::__batchSend - size: ${this.queue.length}`)
    const task = await this.client
      .index(this.index_uid)
      .addDocuments(this.queue)
    await this.client.waitForTask(task.taskUid, { timeOutMs: 15000 })
  }

  async __swapIndex() {
    console.log('Sender::__swapIndex')
    await this.client.swapIndexes([
      { indexes: [this.initial_index_uid, this.index_uid] },
    ])
    const task = await this.client.deleteIndex(this.index_uid)
    await this.client.index(this.index_uid).waitForTask(task.taskUid)
  }
}
