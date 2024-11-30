import axios from "axios";
import { Config } from "../../src/types";
import { MeiliSearch } from "meilisearch";

export class ScraperTestHelper {
  private meiliClient: MeiliSearch;
  private scraperUrl: string;

  constructor() {
    this.meiliClient = new MeiliSearch({
      host: process.env.MEILI_HOST || "http://localhost:7700",
      apiKey: process.env.MEILI_MASTER_KEY || "masterKey",
    });
    this.scraperUrl = process.env.SCRAPER_URL || "http://localhost:8080";
  }

  async startScraping(config: Config, useAsync = false): Promise<string> {
    const endpoint = useAsync ? "/crawl/async" : "/crawl/sync";
    const url = `${this.scraperUrl}${endpoint}`;
    console.log(`Scraping URL: ${url}`);

    try {
      const response = await axios.post(url, config);
      console.log("Response:", response.status, response.statusText);
      if (!response.data?.indexUid && !config.meilisearch_index_uid) {
        throw new Error("No index UID returned from server or config");
      }
      return response.data?.indexUid || config.meilisearch_index_uid;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Axios Error Details:", {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          method: error.config?.method,
          requestData: error.config?.data,
        });
      } else {
        console.error("Non-Axios Error:", error);
      }
      throw error;
    }
  }

  async waitForScrapingToComplete(
    indexUid: string,
    timeoutMs = 30000
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const tasks = await this.meiliClient.index(indexUid).getTasks();
      const pendingTasks = tasks.results.filter(
        (task) => task.status !== "succeeded" && task.status !== "failed"
      );

      if (pendingTasks.length === 0) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error(`Scraping didn't complete within ${timeoutMs}ms timeout`);
  }

  async getSearchResults(
    indexUid: string,
    query: string,
    maxAttempts = 10,
    delayMs = 1000
  ): Promise<any> {
    return await this.retryOperation(
      async () => {
        const response = await this.meiliClient.index(indexUid).search(query);
        return response;
      },
      maxAttempts,
      delayMs
    );
  }

  async debugAllIndexes() {
    const indexes = await this.meiliClient.getIndexes();
    console.log("Indexes:", indexes);
  }

  async debugAllStats() {
    const stats = await this.meiliClient.getStats();
    console.log("Stats:", stats);
  }

  async getStats(
    indexUid: string,
    maxAttempts = 10,
    delayMs = 1000
  ): Promise<any> {
    return await this.retryOperation(
      async () => {
        const stats = await this.meiliClient.index(indexUid).getStats();
        return stats;
      },
      maxAttempts,
      delayMs
    );
  }

  async getSettings(
    indexUid: string,
    maxAttempts = 10,
    delayMs = 1000
  ): Promise<any> {
    return await this.retryOperation(
      async () => {
        const settings = await this.meiliClient.index(indexUid).getSettings();
        return settings;
      },
      maxAttempts,
      delayMs
    );
  }

  async deleteIndex(indexUid: string) {
    try {
      await this.meiliClient.deleteIndex(indexUid);
    } catch (error) {
      // Ignore if index doesn't exist
    }
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxAttempts: number,
    delayMs: number
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }
        console.log(
          `Attempt ${attempt}/${maxAttempts} failed, retrying in ${delayMs}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    throw new Error("Operation failed after all attempts");
  }
}
