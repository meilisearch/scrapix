import axios from "axios";
import { Config } from "../../src/types";
import { MeiliSearch } from "meilisearch";

export class ScraperTestHelper {
  private meiliClient: MeiliSearch;
  private scraperUrl: string;
  private indexUid: string;

  constructor(indexUid: string) {
    this.indexUid = indexUid;
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

  async waitForScrapingToComplete(timeoutMs = 30000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const tasks = await this.meiliClient.index(this.indexUid).getTasks();
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
    query: string = "",
    options: Record<string, any> | undefined = undefined,
    maxAttempts = 10,
    delayMs = 1000
  ): Promise<any> {
    return await this.retryOperation(
      async () => {
        const response = await this.meiliClient
          .index(this.indexUid)
          .search(query, options);

        if (response.hits.length === 0) {
          throw new Error("No search results found");
        } else {
          return response.hits;
        }
      },
      maxAttempts,
      delayMs
    );
  }

  async debugStats() {
    const stats = await this.getStats();
    console.log("Stats:", stats);
  }

  async debugSearchResults(
    query: string = "",
    options: Record<string, any> | undefined = undefined
  ) {
    const searchResults = await this.getSearchResults(query, options);
    console.log("Search Results:", searchResults);
  }

  async debugSettings() {
    const settings = await this.getSettings();
    console.log("Settings:", settings);
  }

  async getStats(maxAttempts = 10, delayMs = 1000): Promise<any> {
    return await this.retryOperation(
      async () => {
        const stats = await this.meiliClient.index(this.indexUid).getStats();
        return stats;
      },
      maxAttempts,
      delayMs
    );
  }

  async getSettings(maxAttempts = 10, delayMs = 1000): Promise<any> {
    return await this.retryOperation(
      async () => {
        const settings = await this.meiliClient
          .index(this.indexUid)
          .getSettings();
        return settings;
      },
      maxAttempts,
      delayMs
    );
  }

  async deleteIndex() {
    try {
      await this.meiliClient.deleteIndex(this.indexUid);
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
