import { Config } from "../src/types";

// Extend the global jest object with our custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveSearchResult(expected: any): R;
      toHaveDocumentCount(expected: number): R;
      toMatchSearchResults(expected: any[]): R;
    }
  }
}

// Custom matchers
expect.extend({
  toHaveSearchResult(received: any[], expected: any) {
    const found = received.some((item) =>
      Object.entries(expected).every(([key, value]) => item[key] === value)
    );

    return {
      message: () =>
        `expected ${JSON.stringify(received)} to have an item matching ${JSON.stringify(expected)}`,
      pass: found,
    };
  },

  toHaveDocumentCount(
    received: { numberOfDocuments: number },
    expected: number
  ) {
    const pass = received.numberOfDocuments === expected;

    return {
      message: () =>
        `expected ${received.numberOfDocuments} documents to equal ${expected}`,
      pass,
    };
  },

  toMatchSearchResults(received: any[], expected: any[]) {
    const pass =
      received.length === expected.length &&
      received.every((item, index) => {
        const expectedItem = expected[index];
        return Object.entries(expectedItem).every(
          ([key, value]) => item[key] === value
        );
      });

    return {
      message: () =>
        `expected search results to match:\n` +
        `Received: ${JSON.stringify(received, null, 2)}\n` +
        `Expected: ${JSON.stringify(expected, null, 2)}`,
      pass,
    };
  },
});

// Test configuration helper
export const createTestConfig = (overrides: Partial<Config> = {}): Config => ({
  start_urls: ["http://playground:3000"],
  meilisearch_index_uid: `test-${Date.now()}`,
  meilisearch_url: "http://meilisearch:7700",
  meilisearch_api_key: "masterKey",
  ...overrides,
});
