import express from "express";
import Sender from "./sender.js";
import Crawler from "./crawler.js";

const app = express();

app.use(express.json());

app.post("/crawl", async (req, res) => {
  ///get the urls from the request body
  console.log(req.body);
  const urls = req.body.urls;
  const meilisearch_host = req.body.meilisearch_host;
  const meilisearch_api_key = req.body.meilisearch_api_key;
  const meilisearch_index_name = req.body.meilisearch_index_name;

  //configure the Sender
  const sender = new Sender({
    meilisearch_host,
    meilisearch_api_key,
    meilisearch_index_name,
  });

  const crawler = new Crawler(sender, { urls });
  await crawler.run();
  await sender.finish();
  ///return the response
  res.send("Crawling finished");
});

app.listen(3000, () => console.log("Example app listening on port 3000!"));
