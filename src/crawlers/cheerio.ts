import {
  createCheerioRouter,
  CheerioCrawler as CrawleeCheerioCrawler,
  CheerioCrawlerOptions,
  CheerioHook,
  CheerioCrawlingContext,
  Router,
  RequestQueue,
} from "crawlee";
import { BaseCrawler } from "./base";
import { Sender } from "../sender";
import { Config } from "../types";

export class CheerioCrawler extends BaseCrawler {
  constructor(sender: Sender, config: Config) {
    super(sender, config);
  }

  createRouter(): Router<CheerioCrawlingContext> {
    return createCheerioRouter();
  }

  getCrawlerOptions(
    requestQueue: RequestQueue,
    router: Router<CheerioCrawlingContext>
  ): CheerioCrawlerOptions {
    const preNavigationHooks: CheerioHook[] = this.config
      .additional_request_headers
      ? [
          (crawlingContext) => {
            const { request } = crawlingContext;
            request.headers = {
              ...request.headers,
              ...this.config.additional_request_headers,
            };
          },
        ]
      : [];

    return {
      requestQueue,
      requestHandler: router as any,
      preNavigationHooks: preNavigationHooks,
    };
  }

  createCrawlerInstance(options: CheerioCrawlerOptions): CrawleeCheerioCrawler {
    return new CrawleeCheerioCrawler(options);
  }

  override async defaultHandler(context: CheerioCrawlingContext) {
    await this.handlePage(context);
  }
}
