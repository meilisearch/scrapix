# Scrapix

This project is an API that will allow you to scrap any website and send the data to Meilisearch.

This server have only one endpoint.

## Endpoint

### POST /crawl

This endpoint will crawl the website and send the data to Meilisearch.
data:

```json
{
  "start_urls": ["https://www.google.com"],
  "urls_to_exclude": ["https://www.google.com"],
  "urls_to_index": ["https://www.google.com"],
  "urls_to_not_index": ["https://www.google.com"],
  "meilisearch_url": "http://localhost:7700",
  "meilisearch_api_key": "masterKey",
  "meilisearch_index_uid": "google",
  "stategy": "default", // docssearch, schema*, custom or default
  "headless": true, // Open browser or not
  "batch_size": 100, //null with send documents one by one
  "primary_key": null,
  "meilisearch_settings": {
    "searchableAttributes": [
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "p",
      "title",
      "meta.description"
    ],
    "filterableAttributes": ["urls_tags"],
    "distinctAttribute": "url"
  },
  "schema_settings": {
    "only_type": "Product", // Product, Article, etc...
    "convert_dates": true // default false
  }
}
```

## Process

### 1. Add it to the queue

While the server receive a crawling request it will add it to the queue. When the data is added to the queue it will return a response to the user.
The queue is handle by redis ([Bull](https://github.com/OptimalBits/bull)).
The queue will dispatch the job to the worker.

### 2. Scrape the website

#### 2.1. Default strategy

The worker will crawl the website by keeping only the page that have the same domain as urls given in parameters. It will not try to scrap the external links or files. It will also not try to scrape when pages are paginated pages (like `/page/1`).
For each scrappable page it will scrape the data by trying to create blocks of titles and text. Each block will contains:

- h1: The title of the block
- h2: The sub title of the block
- h3...h6: The sub sub title of the block
- p: The text of the block (will create an array of text if there is multiple p in the block)
- page_block: The block number of the page (staring at 0)
- title: The title of the page present in the head tag
- uid: a generated and incremental uid for the block
- url: The url of the page
- anchor: The anchor of the block (the lower title id of the block)
- meta: The meta of the page present in the head tag (json object containing the desciption, keywords, author, twitter, og, etc...)
- url_tags: the url pathname split by / (array of string). The last element has been removed because it's the page name.

#### 2.2. Docsearch strategy

The worker will crawl the website by keeping only the page that have the same domain as urls given in parameters. It will not try to scrap the external links or files. It will also not try to scrape when pages are paginated pages (like `/page/1`).
For each scrappable page it will scrape the data by trying to create blocks of titles and text. Each block will contains:

- uid: a generated and incremental uid for the block
- hierarchy_lvl0: the url pathname split by / (array of string). The last element has been removed because it's the page name.
- hierarchy_lvl1: the h1 of the block
- hierarchy_lvl2: the h2 of the block
- hierarchy_lvl3: the h3 of the block
- hierarchy_lvl4: the h4 of the block
- hierarchy_lvl5: the h5 of the block
- hierarchy_radio_lvl0: same as hierarchy_lvl0
- hierarchy_radio_lvl1: same as hierarchy_lvl1
- hierarchy_radio_lvl2: same as hierarchy_lvl2
- hierarchy_radio_lvl3: same as hierarchy_lvl3
- hierarchy_radio_lvl4: same as hierarchy_lvl4
- hierarchy_radio_lvl5: same as hierarchy_lvl5
- content: The text of the block (will create an array of text if there is multiple p in the block)
- url: The url of the page with the anchor
- anchor: The anchor of the block (the lower title id of the block)

### 3. Send the data to Meilisearch

While the worker is scraping the website it will send the data to Meilisearch by batch.
Before sending the data to Meilisearch, it will create a new index called `{index_uid}_tmp`, apply the settings and add the data to it. Then it will use the index swap method to replace the old index by the new one. It will finish properly by deleting the tmp index.

The setting applied:

```json
{
  "searchableAttributes": [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "title",
    "meta.description"
  ],
  "filterableAttributes": ["urls_tags"],
  "distinctAttribute": "url"
}
```

## Configuration file

`start_urls` _mandatory_

This array contains the list of URLs that will be used to start scraping your website.
The scraper will recursively follow any links (<a> tags) from those pages. It will not follow links that are on another domain.

`urls_to_exclude`
List of the URL's to ignore

`urls_to_not_index`
List of the URLS to index

`urls_to_not_index`
List of the URLS that should not be indexes

`meilisearch_url` _mandatory_
The URL to your Meilisearch instance

`meilisearch_api_key`
The API key to your Meilisearch instance. It has to have at least write and read access on the specified index.

`meilisearch_index_uid` _mandatory_
Name of the index on which the content is indexed.

`stategy`
default: `default`
Scraping strategy: - `default` Scraps the content of webpages, it suits most use cases. It indexes the content in this format (show example) - `docssearch` Scraps the content of webpages, it suits most use cases. The difference with the default strategy is that it indexes the content in a format compatible with docs-search bar - `schema` Scraps the [`schema`](https://schema.org/) information of your web app.

`headless`
default: `true`
Wether or not the javascript should be loaded before scraping starts.

`primary_key`
The key name in your documents containing their unique identifier.

`meilisearch_settings`
Your custom Meilisearch settings

`schema_settings`
If you strategy is `schema`:
`only_type`: Which types of schema should be parsed
`convert_dates`: If dates should be converted to timestamp. This is usefull to be able to order by date.

`user_agents`
An array of user agents that are append at the end of the current user agents.
In this case, if your `user_agents` value is `['My Thing (vx.x.x)']` the final `user_agent` becomes

```
Meilisearch JS (vx.x.x); Meilisearch Crawler (vx.x.x); My Thing (vx.x.x)
```

`webhook_payload`
In the case [webhooks](#webhooks) are enabled, the webhook_payload option gives the possibility to provide information that will be added in the webhook payload.

`webhook_url`
The URL on which the webhook calls are made.

## Webhooks

To be able to receive updates on the state of the crawler, you need to create a webhook. To do so, you absolutely need to have a public URL that can be reached by the crawler. This URL will be called by the crawler to send you updates.

To enable webhooks, you need add the following env vars.

```txt
WEBHOOK_URL=https://mywebsite.com/webhook
WEBHOOK_TOKEN=mytoken
WEBHOOK_INTERVAL=1000
```

- The `WEBHOOK_URL` is the URL that will be called by the crawler. The calls will be made with the `POST` method.
- The `WEBHOOK_TOKEN` is a token string that will be used to sign the request. It will be used if present in the `Authorization` header of the request in the format `Authorization: Bearer ${token}`.
- The `WEBHOOK_INTERVAL` is a way to change the frequency you want to receive updated from the scraper. The value is in milliseconds. The default value is 5000ms.

Here is the Webhook payload:

```json
{
  "date": "2022-01-01T12:34:56.000Z",
  "meilisearch_url": "https://myproject.meilisearch.com",
  "meilisearch_index_uid": "myindex",
  "status": "active", // "added", "completed", "failed", "active", "wait", "delayed"
  "nb_page_crawled": 20,
  "nb_page_indexed": 15
}
```

It is possible to add additional information in the webhook payload through the `webhook_payload` configuration
