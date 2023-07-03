#!/bin/sh

async_url="http://localhost:8080/crawl/async"
payload='{
  "start_urls": [
    "http://localhost:3000"
  ],
  "meilisearch_url": "http://localhost:7700",
  "meilisearch_api_key": "masterKey",
  "meilisearch_index_uid": "docusaurus-docsearch",
  "strategy": "docssearch"
}'

echo "Async crawling test"
response=$(curl -X POST -H "Content-Type: application/json" -d "$payload" "$async_url")

# Check if the response equals "Crawling start"
if [ "$response" = "Crawling started" ]; then
  echo "Async crawling started successfully!"
else
  echo "Async Crawling failed or returned an unexpected response."
  echo $response
  exit 1
fi

sync_url="http://localhost:8080/crawl/sync"

echo "Sync crawling test"
response=$(curl -X POST -H "Content-Type: application/json" -d "$payload" "$sync_url")

# Check if the response equals "Crawling finished"
if [ "$response" = "Crawling finished" ]; then
  echo "Sync crawling finished successfully!"
else
  echo "Sync crawling failed or returned an unexpected response."
  echo $response
  exit 1
fi

exit 0
