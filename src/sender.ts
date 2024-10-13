import { MeiliSearch, Settings } from "meilisearch";
import { Config, DocumentType } from "./types";
import { initMeilisearchClient } from "./utils/meilisearch_client";
import { Webhook } from "./webhook";
import { Log } from "@crawlee/core";

const log = new Log({ prefix: "MeilisearchSender" });

//Create a class called Sender that will queue the json data and batch it to a Meilisearch instance
export class Sender {
  config: Config;
  queue: DocumentType[] = [];
  initial_index_uid: string;
  index_uid: string;
  batch_size: number;
  client: MeiliSearch;
  nb_documents_sent = 0;

  constructor(config: Config) {
    log.info("Initializing MeilisearchSender", { config });
    this.config = config;
    this.initial_index_uid = config.meilisearch_index_uid;
    this.index_uid = this.initial_index_uid;
    this.batch_size = config.batch_size || 1000;

    //Create a Meilisearch client
    this.client = initMeilisearchClient({
      host: config.meilisearch_url,
      apiKey: config.meilisearch_api_key,
      clientAgents: config.user_agents,
    });
  }

  async init() {
    log.debug("Starting Sender initialization");
    try {
      await Webhook.get(this.config).started(this.config);
      const index = await this.client.getIndex(this.initial_index_uid);

      if (index) {
        this.index_uid = this.initial_index_uid + "_crawler_tmp";

        const tmp_index = await this.client.getIndex(this.index_uid);
        if (tmp_index) {
          const task = await this.client.deleteIndex(this.index_uid);
          await this.client.waitForTask(task.taskUid);
        }
      }

      await this.client.createIndex(this.index_uid, {
        primaryKey: this.config.primary_key || "uid",
      });
      log.info("Sender initialization completed", { indexUid: this.index_uid });
    } catch (e) {
      log.warning("Error during Sender initialization", { error: e });
    }
  }

  //Add a json object to the queue
  async add(data: DocumentType) {
    this.nb_documents_sent++;
    if (!data.uid) {
      log.warning("Document without uid", { data });
    }

    if (this.config.primary_key && this.config.primary_key !== "uid") {
      delete data["uid"];
    }

    if (this.batch_size) {
      this.queue.push(data);
      if (this.queue.length >= this.batch_size) {
        this.__batchSend();
        this.queue = [];
      }
    } else {
      await this.client.index(this.index_uid).addDocuments([data]);
    }
    log.debug("Adding document to queue", { uid: data.uid });
  }

  async updateSettings(settings: Settings) {
    log.debug("Updating Meilisearch index settings");
    const task = await this.client
      .index(this.index_uid)
      .updateSettings(settings);
    await this.client.waitForTask(task.taskUid);
  }

  async finish() {
    log.debug("Starting Sender finish process");
    await this.__batchSendSync();
    const index = await this.client.getIndex(this.index_uid);
    const stats = await index.getStats();
    if (
      this.index_uid !== this.initial_index_uid &&
      stats.numberOfDocuments > 0
    ) {
      await this.__swapIndex();
    } else if (this.index_uid !== this.initial_index_uid) {
      const task = await this.client.deleteIndex(this.index_uid);
      await this.client.index(this.index_uid).waitForTask(task.taskUid);
    }

    await Webhook.get(this.config).completed(
      this.config,
      this.nb_documents_sent
    );
    log.info("Sender finish process completed", {
      documentsSent: this.nb_documents_sent,
    });
  }

  __batchSend() {
    log.debug("Batch sending documents", { queueSize: this.queue.length });
    this.client
      .index(this.index_uid)
      .addDocuments(this.queue)
      .catch((e) => {
        log.error("Error while sending data to MeiliSearch", { error: e });
      });
  }

  async __batchSendSync() {
    log.debug("Synchronous batch sending of documents", {
      queueSize: this.queue.length,
    });
    const task = await this.client
      .index(this.index_uid)
      .addDocuments(this.queue);
    await this.client.waitForTask(task.taskUid, { timeOutMs: 15000 });
  }

  async __swapIndex() {
    log.debug("Swapping Meilisearch indexes");
    await this.client.swapIndexes([
      { indexes: [this.initial_index_uid, this.index_uid] },
    ]);
    const task = await this.client.deleteIndex(this.index_uid);
    await this.client.index(this.index_uid).waitForTask(task.taskUid);
  }
}
