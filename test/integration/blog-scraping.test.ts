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

  it("scrap blog posts with no options", async () => {
    const config = createTestConfig({
      start_urls: ["http://playground:3000/blog"],
    });

    await testInstance.runScraper(config);

    // Test search results
    const searchResults = await testInstance.helper.getSearchResults();
    expect(searchResults).toHaveSearchResult({
      h3: "The Art and History of Camembert Cheese",
    });

    // Test stats
    const stats = await testInstance.helper.getStats();
    expect(stats).toHaveDocumentCount(3); // Assuming 3 blog posts
  });

  it("scrap blog posts with strategy schema", async () => {
    const config = createTestConfig({
      start_urls: ["http://playground:3000/blog"],
      strategy: "schema",
    });

    await testInstance.runScraper(config);

    await testInstance.helper.debugStats();
    await testInstance.helper.debugSearchResults();
    await testInstance.helper.debugSettings();
  });
});
