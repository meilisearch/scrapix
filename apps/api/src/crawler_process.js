import Sender from "./sender.js";
import Crawler from "./crawler.js";

async function startCrawling(config) {
  const sender = new Sender({
    meilisearch_host: config.meilisearch_host,
    meilisearch_api_key: config.meilisearch_api_key,
    meilisearch_index_name: config.meilisearch_index_name,
  });
  await sender.init();

  const urls = config.urls;
  const crawler = new Crawler(sender, config);

  await crawler.run();
  await sender.finish();
}

// Listen for messages from the parent thread
process.on("message", async (message) => {
  await startCrawling(message);
  process.send("Crawling finished");
});
