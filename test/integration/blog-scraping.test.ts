import { BaseTest } from "../helpers/BaseTest";
import { createTestConfig } from "../setup";

describe("Blog Scraping", () => {
  let testInstance: BaseTest;

  beforeEach(() => {
    testInstance = new BaseTest();
    return testInstance.setup();
  });

  afterEach(() => {
    return testInstance.teardown();
  });

  const runScrapingTest = async (useAsync = false) => {
    const config = createTestConfig({
      start_urls: ["http://playground:3000/blog"],
    });

    await testInstance.runScraper(config, useAsync);

    await testInstance.helper.debugAllIndexes();
    await testInstance.helper.debugAllStats();

    // Test search results
    const searchResults = await testInstance.helper.getSearchResults(
      testInstance.currentIndexUid!,
      ""
    );
    expect(searchResults?.hits).toHaveSearchResult({
      h3: "The Art and History of Camembert Cheese",
    });

    // Test stats
    const stats = await testInstance.helper.getStats(
      testInstance.currentIndexUid!
    );
    expect(stats).toHaveDocumentCount(3); // Assuming 3 blog posts
  };

  it("should scrape blog posts correctly", async () => {
    await runScrapingTest();
  });
});
