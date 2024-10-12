import axios, { AxiosResponse } from "axios";
import { Config } from "./types";
import { Log } from "@crawlee/core";

const log = new Log({ prefix: "WebhookNotifier" });

// This webhook sender is a singleton
export class Webhook {
  private static instance: Webhook;
  private webhook_url: string | undefined;

  configured = false;

  constructor(config: Config) {
    log.info("Initializing WebhookNotifier", {
      webhookConfigured: !!config.webhook_url,
    });
    if (config.webhook_url || process.env.WEBHOOK_URL) {
      this.configured = true;
      this.webhook_url = config.webhook_url || process.env.WEBHOOK_URL;
    } else {
      log.warning(
        "WebhookNotifier not configured. Set WEBHOOK_URL environment variable or provide webhook_url in config for notifications."
      );
    }
  }

  public static get(config: Config): Webhook {
    if (!Webhook.instance) {
      Webhook.instance = new Webhook(config);
    }
    return Webhook.instance;
  }

  async started(config: Config) {
    if (!this.configured) return;
    await this.__callWebhook(config, { status: "started" });
  }

  async active(config: Config, data: Record<string, any>) {
    if (!this.configured) return;
    await this.__callWebhook(config, { status: "active", ...data });
  }

  async paused(config: Config) {
    if (!this.configured) return;
    await this.__callWebhook(config, { status: "paused" });
  }

  async completed(config: Config, nbDocumentsSent: number) {
    if (!this.configured) return;
    await this.__callWebhook(config, {
      status: "completed",
      nb_documents_sent: nbDocumentsSent,
    });
  }

  async failed(config: Config, error: Error) {
    if (!this.configured) return;
    await this.__callWebhook(config, {
      status: "failed",
      error: error.message,
    });
  }

  async __callWebhook(config: Config, data: any) {
    if (!this.webhook_url) return;
    try {
      data.meilisearch_url = config.meilisearch_url;
      data.meilisearch_index_uid = config.meilisearch_index_uid;

      if (config.webhook_payload) {
        data.webhook_payload = config.webhook_payload;
      }

      const date = new Date();
      data.date = date.toISOString();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (process.env.WEBHOOK_TOKEN) {
        headers["Authorization"] = `Bearer ${process.env.WEBHOOK_TOKEN}`;
      }

      log.debug("Sending webhook notification", {
        url: this.webhook_url,
        status: data.status,
      });
      const response: AxiosResponse = await axios.post(this.webhook_url, data, {
        headers: headers,
      });
      log.info("Webhook notification sent successfully", {
        status: response.status,
        webhookStatus: data.status,
      });
      if (response.status == 401 || response.status == 403) {
        log.error("Webhook authentication failed", { status: response.status });
        this.configured = false;
      }
    } catch (error) {
      log.error("Failed to send webhook notification", {
        error,
        status: data.status,
      });
    }
  }
}
