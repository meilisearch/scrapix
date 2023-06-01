import { MeiliSearch } from "meilisearch";

//Create a class called Sender that will queue the json data and batch it to a Meilisearch instance
export default class Sender {
  constructor(config) {
    this.queue = [];
    this.origin_index_name = config.meilisearch_index_name;
    this.index_name = this.origin_index_name;
    this.batch_size = config.batch_size || 100;

    //Create a Meilisearch client
    this.client = new MeiliSearch({
      host: config.meilisearch_host,
      apiKey: config.meilisearch_api_key,
    });
  }

  async init() {
    console.log("__initIndex");
    try {
      const index = await this.client.getIndex(this.origin_index_name);
      if (index) {
        this.index_name = this.origin_index_name + "_tmp";
        console.log("index already exists, creating tmp index");

        const task = await this.client.deleteIndex(this.index_name);
        await this.client.waitForTask(task.taskUid);
      }
    } catch (e) {
      console.log(e);
    }
    console.log("__initIndex finished");
  }

  //Add a json object to the queue
  async add(data) {
    if (!data.uid) {
      return;
    }

    if (this.batch_size) {
      this.queue.push(data);
      if (this.queue.length >= this.batch_size) {
        await this.__batchSend();
      }
    } else {
      const task = await this.client.index(this.index_name).addDocuments(data);
    }
  }

  async updateSettings(settings) {
    let task = await this.client
      .index(this.index_name)
      .updateSettings(settings);
    await this.client.waitForTask(task.taskUid);
  }

  async finish() {
    if (this.index_name !== this.origin_index_name) {
      await this.__batchSend();
      await this.__swapIndex();
    }
  }

  async __batchSend() {
    console.log("__batchSend - size:" + this.queue.length);
    const task = await this.client
      .index(this.index_name)
      .addDocuments(this.queue);
    this.queue = [];
    await this.client.waitForTask(task.taskUid);
    console.log("__batchSend finished");
  }

  async __swapIndex() {
    console.log("__swapIndex");
    let task = await this.client.swapIndexes([
      { indexes: [this.origin_index_name, this.index_name] },
    ]);
    await this.client.index(this.index_name).waitForTask(task.taskUid);
    await this.client.deleteIndex(this.index_name);
    console.log("__swapIndex finished");
  }
}
