import { MeiliSearch } from "meilisearch";

export default async function globalSetup() {
  const meiliClient = new MeiliSearch({
    host: process.env.MEILI_HOST || "http://localhost:7700",
    apiKey: process.env.MEILI_MASTER_KEY || "masterKey",
  });

  console.log("Cleaning up Meilisearch indexes...");
  try {
    const { results: indexes } = await meiliClient.getIndexes();
    await Promise.all(
      indexes.map((index) => meiliClient.deleteIndex(index.uid))
    );
    console.log(`Cleaned up ${indexes.length} indexes`);
  } catch (error) {
    console.error("Failed to clean up Meilisearch:", error);
  }
}
