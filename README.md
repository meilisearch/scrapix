# Scrapix 
This project is an API that will allow you to scrap any website and send the data to Meilisearch.

This server have only one endpoint. 

## Endpoint
### POST /scrap
This endpoint will scrap the website and send the data to Meilisearch.
data: 
```json
{
    "urls": "https://www.google.com",
    "meilisearch_host": "http://localhost:7700",
    "meilisearch_api_key": "masterKey",
    "meilisearch_index_name": "google"
}
```
