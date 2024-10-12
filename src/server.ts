import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import { TaskQueue } from "./taskQueue";
import { Sender } from "./sender";
import { Crawler } from "./crawlers";
import { Config } from "./types";
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
    this.app.post("/crawl/start", this.__startCrawl.bind(this));
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
    this.taskQueue.add(req.body);
    log.info("Asynchronous crawl task added to queue", { config: req.body });
    res.send("Crawling task queued");
  }

  async __syncCrawl(req: express.Request, res: express.Response) {
    const config: Config = req.body;
    log.info("Starting synchronous crawl", { config });
    const sender = new Sender(config);
    await sender.init();

    const crawler = await Crawler.create(
      config.crawler_type || "puppeteer",
      sender,
      config,
      config.launch_options,
      config.launcher
    );

    await Crawler.run(crawler);
    await sender.finish();

    log.info("Synchronous crawl completed", { config });
    res.send("Crawling finished");
  }

  async __startCrawl(req: express.Request, res: express.Response) {
    const config: Config = req.body;
    log.info("Starting crawl process", { config });
    res.send("Crawling started");

    const sender = new Sender(config);
    await sender.init();

    const crawler = await Crawler.create(
      config.crawler_type || "puppeteer",
      sender,
      config,
      config.launch_options,
      config.launcher
    );

    await Crawler.run(crawler);
    await sender.finish();
    log.info("Crawl process completed", { config });
  }

  __log_webhook(req: express.Request, res: express.Response) {
    log.info("Webhook received", { body: req.body });
    res.send("Webhook acknowledged");
  }
}

new Server();
