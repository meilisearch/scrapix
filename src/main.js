import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import TaskQueue from "./taskQueue.js";

const port = process.env.PORT || 3000;

class Main {
  constructor() {
    this.taskQueue = new TaskQueue();

    this.app = express();
    this.app.use(express.json());
    this.app.post("/crawl", this.__crawl.bind(this));

    this.app.listen(port, () =>
      console.log(`Example app listening on port ${port}!`)
    );
  }

  async __crawl(req, res) {
    this.taskQueue.add(req.body);
    res.send("Crawling started");
  }
}

new Main();
