import { MeiliSearch } from "meilisearch";

//Create a class called Sender that will queue the json data and batch it to a Meilisearch instance
export default class Sender {
  constructor(config) {
    this.queue = [];
    this.origin_index_name = config.meilisearch_index_name;
    this.index_name = this.origin_index_name;
    this.docsearch_format = config.docsearch_format || false;
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
    await this.client.waitForTask(task.taskUid);
    console.log("__initIndex finished");
  }

  //Add a json object to the queue
  async add(data) {
    if (!data.uid) {
      return;
    }
    if (this.docsearch_format) {
      data = this.__adaptToDocsearch(data);
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

  __adaptDataToDocsearch(data) {
    let new_data = {};
    new_data.uid = data.uid;
    new_data.hierarchy_lvl0 = data.url_tags[0];
    new_data.hierarchy_lvl1 = data.h1;
    new_data.hierarchy_lvl2 = data.h2;
    new_data.hierarchy_lvl3 = data.h3;
    new_data.hierarchy_lvl4 = data.h4;
    new_data.hierarchy_lvl5 = data.h5;
    new_data.hierarchy_radio_lvl0 = null;
    new_data.hierarchy_radio_lvl1 = data.h1;
    new_data.hierarchy_radio_lvl2 = data.h2;
    new_data.hierarchy_radio_lvl3 = data.h3;
    new_data.hierarchy_radio_lvl4 = data.h4;
    new_data.hierarchy_radio_lvl5 = data.h5;
    new_data.content = data.p;
    new_data.url = data.url + "#" + data.anchor;
    new_data.anchor = data.anchor.substring(1);
    return new_data;
  }
}
