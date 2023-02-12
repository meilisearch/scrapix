import * as dotenv from "dotenv";
dotenv.config();

import express from "express";

import TaskQueue from "./taskQueue.js";

class Main {
  constructor() {
    this.taskQueue = new TaskQueue();

    this.app = express();
    this.app.use(express.json());
    this.app.post("/crawl", this.__crawl.bind(this));
    this.app.listen(3000, () =>
      console.log("Example app listening on port 3000!")
    );
  }

  async __crawl(req, res) {
    this.taskQueue.add(req.body);
    res.send("Crawling started");
  }
}

new Main();
