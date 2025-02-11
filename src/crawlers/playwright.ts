import {
  createPlaywrightRouter,
  PlaywrightCrawler as CrawleePlaywrightCrawler,
  PlaywrightCrawlerOptions,
  PlaywrightHook,
  PlaywrightCrawlingContext,
  Router,
  RequestQueue,
} from "crawlee";
import { LaunchOptions } from "playwright";
// import { firefox } from "playwright";
import { BaseCrawler } from "./base";
import { Sender } from "../sender";
import { Config } from "../types";

export class PlaywrightCrawler extends BaseCrawler {
  launchOptions: LaunchOptions = {};

  constructor(
    sender: Sender,
    config: Config,
    launchOptions: LaunchOptions = {}
  ) {
    super(sender, config);
    this.launchOptions = launchOptions;
  }

  createRouter(): Router<PlaywrightCrawlingContext> {
    return createPlaywrightRouter();
  }

  getCrawlerOptions(
    requestQueue: RequestQueue,
    router: Router<PlaywrightCrawlingContext>
  ): PlaywrightCrawlerOptions {
    const preNavigationHooks: PlaywrightHook[] = this.config
      .additional_request_headers
      ? [
          async (crawlingContext) => {
            await crawlingContext.page.route("**/*", async (route) => {
              const request = route.request();
              await route.continue({
                headers: {
                  ...request.headers(),
                  ...this.config.additional_request_headers,
                },
              });
            });
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
          ...this.launchOptions,
        },
      },
    };
  }

  createCrawlerInstance(
    options: PlaywrightCrawlerOptions
  ): CrawleePlaywrightCrawler {
    return new CrawleePlaywrightCrawler(options);
  }

  override async defaultHandler(context: PlaywrightCrawlingContext) {
    await this.handlePage(context);
  }
}
