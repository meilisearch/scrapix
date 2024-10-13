import Queue, { Job, DoneCallback } from "bull";
import { initMeilisearchClient } from "./utils/meilisearch_client";
import { fork } from "child_process";
import { Config } from "./types";
import { Log } from "@crawlee/core";

const log = new Log({ prefix: "CrawlTaskQueue" });

export class TaskQueue {
  queue: Queue.Queue;

  constructor() {
    log.info("Initializing CrawlTaskQueue", {
      redisUrl: process.env.REDIS_URL,
    });
    if (process.env.REDIS_URL) {
      this.queue = new Queue("crawling", process.env.REDIS_URL);
    } else {
      this.queue = new Queue("crawling");
    }
    void this.queue.process(this.__process.bind(this));
    this.queue.on("added", this.__jobAdded.bind(this));
    this.queue.on("completed", this.__jobCompleted.bind(this));
    this.queue.on("failed", this.__jobFailed.bind(this));
    this.queue.on("active", this.__jobActive.bind(this));
    this.queue.on("wait", this.__jobWaiting.bind(this));
    this.queue.on("delayed", this.__jobDelayed.bind(this));
  }

  add(data: Config) {
    log.debug("Adding task to queue", { config: data });
    void this.queue.add(data);
  }

  __process(job: Job, done: DoneCallback) {
    log.debug("Processing job", { jobId: job.id });
    const childProcess = fork("./dist/src/crawler_process.js");
    childProcess.send(job.data);
    childProcess.on("message", (message) => {
      log.info("Crawler process message", { message });
      done();
    });
  }

  __jobAdded(job: Job) {
    log.debug("Job added to queue", { jobId: job.id });
  }

  __jobCompleted(job: Job) {
    log.debug("Job completed", { jobId: job.id });
  }

  async __jobFailed(job: Job<Config>) {
    log.error("Job failed", { jobId: job.id });
    //Create a Meilisearch client
    const client = initMeilisearchClient({
      host: job.data.meilisearch_url,
      apiKey: job.data.meilisearch_api_key,
      clientAgents: job.data.user_agents,
    });

    //check if the tmp index exists
    const tmp_index_uid = job.data.meilisearch_index_uid + "_crawler_tmp";
    try {
      const index = await client.getIndex(tmp_index_uid);
      if (index) {
        const task = await client.deleteIndex(tmp_index_uid);
        await client.waitForTask(task.taskUid);
      }
    } catch (e) {
      log.error("Error while deleting tmp index", { error: e });
    }
  }

  __jobActive(job: Job) {
    log.debug("Job became active", { jobId: job.id });
  }

  __jobWaiting(job: Job) {
    log.debug("Job is waiting", { jobId: job.id });
  }

  __jobDelayed(job: Job) {
    log.debug("Job is delayed", { jobId: job.id });
  }
}
