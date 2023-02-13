import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import TaskQueue from "./taskQueue.js";
import Sender from "./sender.js";
import Crawler from "./crawler.js";

const port = process.env.PORT || 3000;

class Main {
  constructor() {
    this.taskQueue = new TaskQueue();

    this.app = express();
    this.app.use(express.json());
    this.app.post("/crawl", this.__crawl.bind(this));
    this.app.post("/sync_crawl", this.__syncCrawl.bind(this));

    this.app.listen(port, () =>
      console.log(`Example app listening on port ${port}!`)
    );
  }

  async __crawl(req, res) {
    this.taskQueue.add(req.body);
    console.log("Crawling started");
    res.send("Crawling started");
  }

  async __syncCrawl(req, res) {
    const sender = new Sender(req.body);
    await sender.init();

    const urls = req.body.urls;
    const crawler = new Crawler(sender, { urls });

    await crawler.run();
    await sender.finish();
    res.send("Crawling finished");
  }
}

new Main();
