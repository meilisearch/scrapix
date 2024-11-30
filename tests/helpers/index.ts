import { MeiliSearch } from "meilisearch";
import axios from "axios";
import { Config } from "../../src/types";

export const MEILISEARCH_URL = "http://localhost:7700";
export const MEILISEARCH_KEY = "masterKey";
export const SCRAPER_URL = "http://localhost:8080";
export const BLOG_URL = "http://playground:3000";

export const meilisearch = new MeiliSearch({
  host: MEILISEARCH_URL,
  apiKey: MEILISEARCH_KEY,
});

export async function waitForMeilisearch(): Promise<void> {
  let isReady = false;
  while (!isReady) {
    try {
      await meilisearch.health();
      isReady = true;
    } catch (e) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

export async function cleanMeilisearch(): Promise<void> {
  const indexes = await meilisearch.getIndexes();
  await Promise.all(
    indexes.results.map((index) => meilisearch.deleteIndex(index.uid))
  );
}

export async function startScraping(config: Config): Promise<string> {
  const response = await axios.post(`${SCRAPER_URL}/crawl/async`, config);
  return response.data.taskId;
}

export async function waitForScrapingComplete(taskId: string): Promise<void> {
  let isComplete = false;
  while (!isComplete) {
    const response = await axios.get(`${SCRAPER_URL}/tasks/${taskId}`);
    if (["completed", "failed"].includes(response.data.status)) {
      isComplete = true;
      if (response.data.status === "failed") {
        throw new Error(`Scraping failed: ${response.data.error}`);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
