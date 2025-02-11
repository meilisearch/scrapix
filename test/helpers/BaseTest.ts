import { ScraperTestHelper } from "./ScraperTestHelper";
import { Config } from "../../src/types";

export interface TestMetrics {
  testName: string;
  startTime: number;
  endTime: number;
  duration: number;
  indexSize: number;
  isAsync: boolean;
}

export class BaseTest {
  public helper: ScraperTestHelper;
  public currentIndexUid: string;
  private metrics: TestMetrics | null = null;

  constructor() {
    this.currentIndexUid = this.generateRandomIndexUid();

    this.helper = new ScraperTestHelper(this.currentIndexUid);
  }

  async setup() {
    // Can be extended by child classes
  }

  async teardown() {
    if (this.currentIndexUid) {
      // Save metrics before deleting the index
      if (this.metrics) {
        await this.saveMetrics();
      }
      await this.helper.deleteIndex();
    }
  }

  private generateRandomIndexUid(): string {
    const testName = expect.getState().currentTestName || "unknown";
    // Clean the test name to make it URL-safe
    const safeTestName = testName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    return `test-${safeTestName}-${Date.now()}`;
  }

  public async runScraper(config: Config, useAsync = false) {
    const startTime = Date.now();

    config.meilisearch_index_uid = this.currentIndexUid;

    await this.helper.startScraping(config, useAsync);

    if (useAsync) {
      await this.helper.waitForScrapingToComplete();
    }

    const endTime = Date.now();
    const stats = await this.helper.getStats();

    this.metrics = {
      testName: expect.getState().currentTestName || "unknown",
      startTime,
      endTime,
      duration: endTime - startTime,
      indexSize: stats?.numberOfDocuments || 0,
      isAsync: useAsync,
    };

    return this.currentIndexUid;
  }

  private async saveMetrics() {
    if (!this.metrics) return;

    console.log("Test Metrics:", {
      testName: this.metrics.testName,
      duration: `${this.metrics.duration}ms`,
      indexSize: this.metrics.indexSize,
      isAsync: this.metrics.isAsync,
      timestamp: new Date(this.metrics.startTime).toISOString(),
    });
  }
}
