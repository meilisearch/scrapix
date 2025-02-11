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

  //Initialize the Sender - The sender is responsible for sending the documents to the Meilisearch instance
  //If the index does not exist, it will be created
  //If the index exists, it will create a temporary index and swap it with the existing one
  async init() {
    log.debug("Starting Sender initialization");
    try {
      await Webhook.get(this.config).started(this.config);

      // Validate required config
      if (!this.initial_index_uid) {
        throw new Error("Meilisearch index UID is required");
      }

      let existingSettings = null;
      let indexExists = false;

      try {
        const index = await this.client.getIndex(this.initial_index_uid);
        log.debug("Index exists", { indexUid: this.initial_index_uid });
        if (index) {
          indexExists = true;
          if (this.config.keep_settings !== false) {
            try {
              existingSettings = await index.getSettings();
            } catch (err) {
              log.warning("Failed to retrieve existing settings", {
                error: err,
              });
            }
          }
        }
      } catch (err) {
        // Index doesn't exist, we'll create it
        log.debug("Index does not exist, will create new one", {
          indexUid: this.initial_index_uid,
        });
      }

      // If index exists, create temporary index
      if (indexExists) {
        this.index_uid = `${this.initial_index_uid}_crawler_tmp`;

        try {
          // Check if temp index exists and delete if needed
          const tmp_index = await this.client.getIndex(this.index_uid);
          if (tmp_index) {
            const deleteTask = await this.client.deleteIndex(this.index_uid);
            await this.client.waitForTask(deleteTask.taskUid);
          }
        } catch (err) {
          // Temp index doesn't exist, which is fine
        }
      }

      // Create the index (either temp or initial)
      try {
        const createTask = await this.client.createIndex(this.index_uid, {
          primaryKey: this.config.primary_key || "uid",
        });
        await this.client.waitForTask(createTask.taskUid);

        // Apply existing settings if needed
        if (existingSettings && this.config.keep_settings !== false) {
          log.info("Applying kept settings to index", {
            indexUid: this.index_uid,
          });
          const settingsTask = await this.client
            .index(this.index_uid)
            .updateSettings(existingSettings);
          await this.client.waitForTask(settingsTask.taskUid);
        }

        log.info("Sender initialization completed", {
          indexUid: this.index_uid,
        });
      } catch (err) {
        throw new Error(
          `Failed to create index: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      log.error("Error during Sender initialization", { error: errorMsg });
      throw new Error(`Sender initialization failed: ${errorMsg}`);
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
    try {
      // Check if original index exists and we want to keep settings
      if (this.config.keep_settings && this.initial_index_uid) {
        try {
          // Try to get existing settings from original index
          const existingSettings = await this.client
            .index(this.initial_index_uid)
            .getSettings();

          log.debug("Copying existing settings to temporary index");
          const task = await this.client
            .index(this.index_uid)
            .updateSettings(existingSettings);
          await this.client.waitForTask(task.taskUid);
          return;
        } catch (error) {
          // If original index doesn't exist, fall through to applying new settings
          log.debug("Original index not found, will apply new settings");
        }
      }

      // Apply new settings if keep_settings is false or original index doesn't exist
      log.debug("Updating Meilisearch index settings");
      const task = await this.client
        .index(this.index_uid)
        .updateSettings(settings);
      await this.client.waitForTask(task.taskUid);
    } catch (error) {
      log.error("Failed to update settings", { error });
      throw error;
    }
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
