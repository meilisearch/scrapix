# Scrapix 
This project is an API that will allow you to scrap any website and send the data to Meilisearch.

This server have only one endpoint. 

## Endpoint
### POST /scrap
This endpoint will scrap the website and send the data to Meilisearch.
data: 
```json
{
    "urls": ["https://www.google.com"],
    "meilisearch_host": "http://localhost:7700",
    "meilisearch_api_key": "masterKey",
    "meilisearch_index_name": "google",
    "docsearch_format": false,
    "batch_size": 100, //null with send documents one by one
}
```

## Process
### 1. Add it to the queue
While the server receive a crawling request it will add it to the queue. When the data is added to the queue it will return a response to the user.
The queue is handle by redis ([Bull](https://github.com/OptimalBits/bull)). 
The queue will dispatch the job to the worker.

### 2. Scrap the website
The worker will crawl the website by keeping only the page that have the same domain as urls given in parameters. It will not try to scrap the external links or files. It will also not try to scrap when pages are paginated pages (like `/page/1`).
For each scrappable page it will scrap the data by trying to create blocks of titles and text. Each block will contains:
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

### 3. Send the data to Meilisearch

While the worker is scraping the website it will send the data to Meilisearch by batch.
Before sending the data to Meilisearch, it will create a new index called `{index_name}_tmp`, apply the settings and add the data to it. Then it will use the index swap method to replace the old index by the new one. It will finish properly by deleting the tmp index.

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