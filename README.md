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
    "indexed_urls": ["https://www.google.com"],
    "exclude_indexed_urls": ["https://www.google.com"],
    "meilisearch_url": "http://localhost:7700",
    "meilisearch_api_key": "masterKey",
    "meilisearch_index_uid": "google",
    "stategy": "default", // docsearch, schema*, custom or default
    "headless": true, // true or false
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
            "meta.description",
        ],
        "filterableAttributes": ["urls_tags"],
        "distinctAttribute": "url",
    },
    "schema": {
        "only_type": "Product", // Product, Article, etc...
        "convert_dates": true, // default false
    },
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
    "meta.description",
    ],
    "filterableAttributes": ["urls_tags"],
    "distinctAttribute": "url",
}
```

## Todo
- [ ] Add the possibility to take a list of char to strip from the text
- [ ] Add a list of url to ignore
- [ ] Add the possibility to configure your Meilisearch (stopwords, synonyms, etc...)
- [ ] Create scraper for specific uses cases websites (like ecommerce, blog, etc...)