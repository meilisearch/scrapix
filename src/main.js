// For more information, see https://crawlee.dev/
import { PuppeteerCrawler, ProxyConfiguration } from "crawlee";
import { router } from "./routes.js";

const startUrls = ["https://platform.openai.com/docs/introduction/overview"];

const crawler = new PuppeteerCrawler({
  // proxyConfiguration: new ProxyConfiguration({ proxyUrls: ['...'] }),
  requestHandler: router,
});

await crawler.run(startUrls);
