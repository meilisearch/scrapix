import { waitForMeilisearch, cleanMeilisearch } from "./helpers";

beforeAll(async () => {
  await waitForMeilisearch();
});

afterAll(async () => {
  await cleanMeilisearch();
});
