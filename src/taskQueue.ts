import Queue, { Job, DoneCallback } from "bull";
import { MeiliSearch } from "meilisearch";
import { fork } from "child_process";
import { Config } from "./types";

const redis_url = process.env.REDIS_URL;

export default class TaskQueue {
  queue: Queue.Queue;

  constructor() {
    console.info("TaskQueue::constructor");
    console.log(redis_url)
    if (redis_url ) {
      this.queue = new Queue("crawling", redis_url);
    }
    else {
      this.queue = new Queue("crawling");
    }
    this.queue.process(this.__process.bind(this));
    this.queue.on("added", this.__jobAdded.bind(this));
    this.queue.on("completed", this.__jobCompleted.bind(this));
    this.queue.on("failed", this.__jobFailed.bind(this));
    this.queue.on("active", this.__jobActive.bind(this));
    this.queue.on("wait", this.__jobWaiting.bind(this));
    this.queue.on("delayed", this.__jobDelayed.bind(this));
  }

  add(data: Config) {
    this.queue.add(data);
  }

  async __process(job: Job, done: DoneCallback) {
    console.log("Job process", job.id);
    const childProcess = fork("./dist/src/crawler_process.js");
    childProcess.send(job.data);
    childProcess.on("message", (message) => {
      console.log(message);
      done();
    });
  }

  async __jobAdded(job: Job) {
    console.log("Job added", job.id);
  }

  async __jobCompleted(job: Job) {
    console.log("Job completed", job.id);
  }

  async __jobFailed(job: Job) {
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

  async __jobActive(job: Job) {
    console.log({ job })
    console.log("Job active", job.id);
  }

  async __jobWaiting(job: Job) {
    console.log("Job waiting", job.id);
  }

  async __jobDelayed(job: Job) {
    console.log("Job delayed", job.id);
  }
}
