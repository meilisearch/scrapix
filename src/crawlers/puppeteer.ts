import {
  createPuppeteerRouter,
  PuppeteerCrawler as CrawleePuppeteerCrawler,
  PuppeteerCrawlerOptions,
  PuppeteerHook,
  PuppeteerCrawlingContext,
  Router,
  RequestQueue,
} from "crawlee";
import { PuppeteerNode } from "puppeteer-core";
import { BaseCrawler } from "./base";
import { Sender } from "../sender";
import { Config } from "../types";

export class PuppeteerCrawler extends BaseCrawler {
  launchOptions: Record<string, any> = {};
  launcher?: PuppeteerNode;

  constructor(
    sender: Sender,
    config: Config,
    launchOptions: Record<string, any> = {},
    launcher?: PuppeteerNode
  ) {
    super(sender, config);
    this.launchOptions = launchOptions;
    this.launcher = launcher;
  }

  createRouter(): Router<PuppeteerCrawlingContext> {
    return createPuppeteerRouter();
  }

  getCrawlerOptions(
    requestQueue: RequestQueue,
    router: Router<PuppeteerCrawlingContext>
  ): PuppeteerCrawlerOptions {
    const preNavigationHooks: PuppeteerHook[] = this.config
      .additional_request_headers
      ? [
          async (crawlingContext) => {
            await crawlingContext.addInterceptRequestHandler(
              async (request) => {
                return await request.continue({
                  headers: {
                    ...request.headers(),
                    ...this.config.additional_request_headers,
                  },
                });
              }
            );
          },
        ]
      : [];

    return {
      requestQueue,
      requestHandler: router as any,
      preNavigationHooks: preNavigationHooks,
      ...(this.config.max_concurrency && {
        maxConcurrency: this.config.max_concurrency,
      }),
      ...(this.config.max_requests_per_minute && {
        maxRequestsPerMinute: this.config.max_requests_per_minute,
      }),
      launchContext: {
        launchOptions: {
          headless: this.config.headless || true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
          ignoreDefaultArgs: ["--disable-extensions"],
          ...this.launchOptions,
        },
        launcher: this.launcher,
      },
    };
  }

  createCrawlerInstance(
    options: PuppeteerCrawlerOptions
  ): CrawleePuppeteerCrawler {
    return new CrawleePuppeteerCrawler(options);
  }

  override async defaultHandler(context: PuppeteerCrawlingContext) {
    await this.handlePage(context);
  }
}
