import { MeiliSearch, Settings } from 'meilisearch'
import { Config, DocsSearchData, DefaultData, SchemaData } from './types'

//Create a class called Sender that will queue the json data and batch it to a Meilisearch instance
export class Sender {
  config: Config
  queue: Array<DocsSearchData | DefaultData | SchemaData>
  initial_index_uid: string
  index_uid: string
  batch_size: number
  client: MeiliSearch

  constructor(config: Config) {
    console.info('Sender::constructor')
    this.queue = []
    this.config = config
    this.initial_index_uid = config.meilisearch_index_uid
    this.index_uid = this.initial_index_uid
    this.batch_size = config.batch_size || 100

    //Create a Meilisearch client
    this.client = new MeiliSearch({
      host: config.meilisearch_url,
      apiKey: config.meilisearch_api_key,
    })
  }

  async init() {
    console.log('Sender::init')
    try {
      const index = await this.client.getIndex(this.initial_index_uid)

      if (index) {
        this.index_uid = this.initial_index_uid + '_tmp'

        const tmp_index = await this.client.getIndex(this.index_uid)
        if (tmp_index) {
          const task = await this.client.deleteIndex(this.index_uid)
          await this.client.waitForTask(task.taskUid)
        }
      }
    } catch (e) {
      console.log('try to delete a tmp index if it exists')
    }

    if (this.config.primary_key) {
      try {
        await this.client
          .index(this.index_uid)
          .update({ primaryKey: this.config.primary_key })
      } catch (e) {
        console.log('try to create or update the index with the primary key')

        await this.client.createIndex(this.index_uid, {
          primaryKey: this.config.primary_key,
        })
      }
    }
  }

  //Add a json object to the queue
  async add(data: DocsSearchData | DefaultData | SchemaData) {
    console.log('Sender::add')
    if (this.config.primary_key) {
      delete data['uid']
    }

    if (this.batch_size) {
      this.queue.push(data)
      if (this.queue.length >= this.batch_size) {
        await this.__batchSend()
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
    console.log('Sender::finish')
    if (this.index_uid !== this.initial_index_uid) {
      await this.__batchSend()
      // If the new index have more than 0 document we swap the index
      const index = await this.client.getIndex(this.index_uid)
      const stats = await index.getStats()
      console.log('stats', stats)
      if (stats.numberOfDocuments > 0) {
        await this.__swapIndex()
      }
    }
  }

  async __batchSend() {
    console.log(`Sender::__batchSend - size: ${this.queue.length}`)
    const task = await this.client
      .index(this.index_uid)
      .addDocuments(this.queue)
    this.queue = []
    await this.client.waitForTask(task.taskUid)
  }

  async __swapIndex() {
    console.log('Sender::__swapIndex')
    const task = await this.client.swapIndexes([
      { indexes: [this.initial_index_uid, this.index_uid] },
    ])
    await this.client.index(this.index_uid).waitForTask(task.taskUid)
  }
}
