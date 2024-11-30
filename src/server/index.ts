import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import { TaskQueue } from "./taskQueue";
import { Sender } from "../sender";
import { Crawler } from "../crawlers";
import { ConfigSchema } from "../types";
import { Log } from "@crawlee/core";

const port = process.env.PORT || 8080;

const log = new Log({ prefix: "CrawlerServer" });

class Server {
  taskQueue: TaskQueue;
  app: express.Application;

  constructor() {
    this.__check_env();

    this.taskQueue = new TaskQueue();
    this.app = express();
    this.app.use(express.json());
    this.app.post("/crawl", this.__asyncCrawl.bind(this));
    this.app.post("/crawl/async", this.__asyncCrawl.bind(this));
    this.app.post("/crawl/sync", this.__syncCrawl.bind(this));
    this.app.post("/webhook", this.__log_webhook.bind(this));

    this.app.listen(port, () =>
      log.debug(`Crawler app listening on port ${port}!`)
    );
  }

  __check_env() {
    const { REDIS_URL } = process.env;
    log.debug("Checking environment variables", { REDIS_URL });
    if (!REDIS_URL) {
      log.warning("REDIS_URL is not set", {
        message: "Some features may not work properly",
      });
    }
  }

  __asyncCrawl(req: express.Request, res: express.Response) {
    try {
      const config = ConfigSchema.parse(req.body);
      this.taskQueue.add(config);
      log.info("Asynchronous crawl task added to queue", { config });
      res.status(200).send({
        status: "ok",
        indexUid: config.meilisearch_index_uid,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      log.error("Invalid configuration received", { error });
      res
        .status(400)
        .send({ status: "error", error: { message: errorMessage } });
    }
  }

  async __syncCrawl(req: express.Request, res: express.Response) {
    try {
      const config = ConfigSchema.parse(req.body);
      log.info("Starting synchronous crawl", { config });
      const sender = new Sender(config);
      await sender.init();

      const crawler = await Crawler.create(config.crawler_type, sender, config);

      await Crawler.run(crawler);
      await sender.finish();

      log.info("Synchronous crawl completed", { config });
      res.status(200).send({
        status: "ok",
        indexUid: config.meilisearch_index_uid,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      log.error("Invalid configuration or crawl error", { error });
      res
        .status(400)
        .send({ status: "error", error: { message: errorMessage } });
    }
  }

  /**
   * Logs the webhook request and sends a response
   *
   * This is an internal endpoint and does not need to be documented.
   */
  __log_webhook(req: express.Request, res: express.Response) {
    log.info("Webhook received", { body: req.body });
    res.status(200).send({ status: "ok" });
  }
}

new Server();
