import { MeiliSearch } from "meilisearch";

//Create a class called Sender that will queue the json data and batch it to a Meilisearch instance
export default class Sender {
  constructor(config) {
    this.queue = [];
    this.origin_index_name = config.meilisearch_index_name;
    this.index_name = this.origin_index_name;
    this.crawing_finished = false;
    this.last_task_number = null;

    //Create a Meilisearch client
    this.client = new MeiliSearch({
      host: config.meilisearch_host,
      apiKey: config.meilisearch_api_key,
    });

    this.__initIndex();
  }

  //Add a json object to the queue
  async add(data) {
    this.queue.push(data);
  }

  async finish() {
    await this.__sendDocuments();
    if (this.index_name !== this.origin_index_name) {
      await this.__swapIndex();
    }
  }

  async __sendDocuments() {
    console.log("__sendDocuments");

    const task = await this.client
      .index(this.index_name)
      .addDocuments(this.queue);
    console.log(
      `Sending ${this.queue.length} documents to Meilisearch... Task: ${task.taskUid}`
    );
    if (!this.last_task_number || task.taskUid > this.last_task_number) {
      this.last_task_number = task.taskUid;
    }
  }

  // TODO: delete the tmp index if it already exists
  async __initIndex() {
    console.log("__initIndex");
    try {
      // console.log("get index");
      const index = await this.client.getIndex(this.origin_index_name);
      // console.log(index);
      if (index) {
        this.index_name = this.origin_index_name + "_tmp";
      }
    } catch (e) {
      // console.log(e);
    }

    await this.client.createIndex(this.index_name);
    let task = await this.client.index(this.index_name).updateSettings({
      searchableAttributes: [
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "p",
        "title",
        "meta.description",
      ],
      filterableAttributes: ["urls_tags"],
      distinctAttribute: "url",
    });

    if (!this.last_task_number || task.taskUid > this.last_task_number) {
      this.last_task_number = task.taskUid;
    }
  }

  async __swapIndex() {
    console.log("__swapIndex");
    if (this.origin_index_name === this.index_name) {
      return;
    }
    console.log("...wait for task: ", this.last_task_number);
    await this.client.index(this.index_name).waitForTask(this.last_task_number);
    let task = await this.client.swapIndexes([
      { indexes: [this.origin_index_name, this.index_name] },
    ]);
    console.log("...wait for task: ", task.taskUid);
    await this.client.index(this.index_name).waitForTask(task.taskUid);
    await this.client.deleteIndex(this.index_name);
    console.log("__swapIndex finished");
  }
}
