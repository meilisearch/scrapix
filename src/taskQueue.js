import Queue from "bull";
import { MeiliSearch } from "meilisearch";
import Sender from "./sender.js";
import Crawler from "./crawler.js";

const redis_url = process.env.REDIS_URL;

export default class TaskQueue {
  constructor() {
    this.queue = new Queue("crawling", redis_url);
    this.queue.process(this.__process.bind(this));
    this.queue.on("added", this.__jobAdded.bind(this));
    this.queue.on("completed", this.__jobCompleted.bind(this));
    this.queue.on("failed", this.__jobFailed.bind(this));
    this.queue.on("active", this.__jobActive.bind(this));
    this.queue.on("wait", this.__jobWaiting.bind(this));
    this.queue.on("delayed", this.__jobDelayed.bind(this));
  }

  add(data) {
    this.queue.add(data);
  }

  async __process(job, done) {
    const sender = new Sender({
      meilisearch_host: job.data.meilisearch_host,
      meilisearch_api_key: job.data.meilisearch_api_key,
      meilisearch_index_name: job.data.meilisearch_index_name,
    });
    await sender.init();

    const urls = job.data.urls;
    const crawler = new Crawler(sender, job.data);

    await crawler.run();
    await sender.finish();
    done();
  }

  async __jobAdded(job) {
    console.log("Job added", job.id);
  }

  async __jobCompleted(job) {
    console.log("Job completed", job.id);
  }

  async __jobFailed(job) {
    console.log("Job failed", job.id);
    let client = new MeiliSearch({
      host: job.data.meilisearch_host,
      apiKey: job.data.meilisearch_api_key,
    });

    //check if the tmp index exists
    const tmp_index_name = job.data.meilisearch_index_name + "_tmp";
    try {
      const index = await client.getIndex(tmp_index_name);
      if (index) {
        const task = await client.deleteIndex(tmp_index_name);
        await client.waitForTask(task.taskUid);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async __jobActive(job) {
    console.log("Job active", job.id);
  }

  async __jobWaiting(job) {
    console.log("Job waiting", job.id);
  }

  async __jobDelayed(job) {
    console.log("Job delayed", job.id);
  }
}
