import { MeiliSearch } from "meilisearch";

//Create a class called Sender that will queue the json data and batch it to a Meilisearch instance
export default class Sender {
  constructor(config) {
    this.queue = [];
    this.origin_index_name = config.meilisearch_index_name;
    this.index_name = this.origin_index_name;
    this.crawing_finished = false;
    this.last_task_number = null;
    this.adapt_to_docsearch = config.adapt_to_docsearch || false;

    //Create a Meilisearch client
    this.client = new MeiliSearch({
      host: config.meilisearch_host,
      apiKey: config.meilisearch_api_key,
    });
  }

  //Add a json object to the queue
  async add(data) {
    if (!data.uid) {
      return;
    }
    if (this.adapt_to_docsearch) {
      data = this.__adaptToDocsearch(data);
    }
    // console.log(data.uid);
    this.queue.push(data);
  }

  async finish() {
    if (this.queue.length === 0) {
      console.log("No documents to send");
      return;
    }
    await this.__initIndex();
    await this.__sendDocuments();
    if (this.index_name !== this.origin_index_name) {
      await this.__swapIndex();
    }
  }

  async __sendDocuments() {
    console.log("__sendDocuments");
    // console.log(this.queue);
    const task = await this.client
      .index(this.index_name)
      .addDocuments(this.queue);
    console.log(
      `Sending ${this.queue.length} documents to Meilisearch... Task: ${task.taskUid}`
    );
    await this.client.waitForTask(task.taskUid);
    if (!this.last_task_number || task.taskUid > this.last_task_number) {
      this.last_task_number = task.taskUid;
    }
  }

  // TODO: delete the tmp index if it already exists
  async __initIndex() {
    console.log("__initIndex");
    try {
      const index = await this.client.getIndex(this.origin_index_name);
      if (index) {
        this.index_name = this.origin_index_name + "_tmp";
      }
    } catch (e) {
      // console.log(e);
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

    if (!this.last_task_number || task.taskUid > this.last_task_number) {
      this.last_task_number = task.taskUid;
    }
  }

  async __swapIndex() {
    console.log("__swapIndex");
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
