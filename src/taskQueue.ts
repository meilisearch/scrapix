import Queue, { Job, DoneCallback } from 'bull'
import { initMeilisearchClient } from './meilisearch_client'
import { fork } from 'child_process'
import { Config } from './types'

const redis_url = process.env.REDIS_URL

export class TaskQueue {
  queue: Queue.Queue

  constructor() {
    console.info('TaskQueue::constructor')
    console.log(redis_url)
    if (redis_url) {
      this.queue = new Queue('crawling', redis_url)
    } else {
      this.queue = new Queue('crawling')
    }
    void this.queue.process(this.__process.bind(this))
    this.queue.on('added', this.__jobAdded.bind(this))
    this.queue.on('completed', this.__jobCompleted.bind(this))
    this.queue.on('failed', this.__jobFailed.bind(this))
    this.queue.on('active', this.__jobActive.bind(this))
    this.queue.on('wait', this.__jobWaiting.bind(this))
    this.queue.on('delayed', this.__jobDelayed.bind(this))
  }

  add(data: Config) {
    void this.queue.add(data)
  }

  __process(job: Job, done: DoneCallback) {
    console.log('Job process', job.id)
    const childProcess = fork('./dist/src/crawler_process.js')
    childProcess.send(job.data)
    childProcess.on('message', (message) => {
      console.log(message)
      done()
    })
  }

  __jobAdded(job: Job) {
    console.log('Job added', job.id)
  }

  __jobCompleted(job: Job) {
    console.log('Job completed', job.id)
  }

  async __jobFailed(job: Job<Config>) {
    console.log('Job failed', job.id)
    //Create a Meilisearch client
    const client = initMeilisearchClient({
      host: job.data.meilisearch_url,
      apiKey: job.data.meilisearch_api_key,
      clientAgents: job.data.user_agents,
    })

    //check if the tmp index exists
    const tmp_index_uid = job.data.meilisearch_index_uid + '_tmp'
    try {
      const index = await client.getIndex(tmp_index_uid)
      if (index) {
        const task = await client.deleteIndex(tmp_index_uid)
        await client.waitForTask(task.taskUid)
      }
    } catch (e) {
      console.error(e)
    }
  }

  __jobActive(job: Job) {
    console.log({ job })
    console.log('Job active', job.id)
  }

  __jobWaiting(job: Job) {
    console.log('Job waiting', job.id)
  }

  __jobDelayed(job: Job) {
    console.log('Job delayed', job.id)
  }
}
