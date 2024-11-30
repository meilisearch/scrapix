import { describe, it, beforeAll, afterEach } from "@jest/globals";
import {
  meilisearch,
  waitForMeilisearch,
  cleanMeilisearch,
  startScraping,
  waitForScrapingComplete,
  BLOG_URL,
} from "../helpers";

import { Strategies } from "../../src/types";

describe("Blog Scraping Tests", () => {
  beforeAll(async () => {
    await waitForMeilisearch();
  });

  afterEach(async () => {
    await cleanMeilisearch();
  });

  it("should scrape blog posts with default strategy", async () => {
    const config = {
      start_urls: [BLOG_URL],
      meilisearch_url: "http://meilisearch:7700",
      meilisearch_api_key: "masterKey",
      meilisearch_index_uid: "playground-default",
    };

    const taskId = await startScraping(config);
    await waitForScrapingComplete(taskId);

    const index = meilisearch.index("playground-default");
    const stats = await index.getStats();
    expect(stats.numberOfDocuments).toBeGreaterThan(0);

    const search = await index.search("cheese");
    expect(search.hits.length).toBeGreaterThan(0);
  });

  it("should scrape blog posts with schema strategy", async () => {
    const config = {
      start_urls: [BLOG_URL],
      meilisearch_url: "http://meilisearch:7700",
      meilisearch_api_key: "masterKey",
      meilisearch_index_uid: "playground-schema",
      strategy: Strategies.Schema,
      schema_settings: {
        only_type: "Article",
      },
    };

    const taskId = await startScraping(config);
    await waitForScrapingComplete(taskId);

    const index = meilisearch.index("playground-schema");
    const settings = await index.getSettings();
    expect(settings.filterableAttributes).toContain("@type");
  });
});
