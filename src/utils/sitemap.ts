import { Log } from "crawlee";
import Sitemapper from "sitemapper";
import fetch from "node-fetch";

const log = new Log({ prefix: "SitemapUtils" });

export async function extractUrlsFromSitemap(
  startUrls: string[]
): Promise<string[]> {
  const sitemapUrls = new Set<string>();
  const processedSitemaps = new Set<string>();
  const sitemap = new Sitemapper({});

  async function processSitemap(url: string) {
    if (processedSitemaps.has(url)) return;
    processedSitemaps.add(url);

    try {
      log.debug("Processing sitemap", { url });
      const { sites } = await sitemap.fetch(url);
      sites.forEach((siteUrl) => sitemapUrls.add(siteUrl));
      log.debug("Found URLs in sitemap", { url, count: sites.length });
    } catch (error) {
      log.warning("Failed to process sitemap", {
        url,
        error: (error as Error).message,
      });
    }
  }

  for (const startUrl of startUrls) {
    try {
      // Try common sitemap locations
      const baseUrl = new URL(startUrl);
      const possibleSitemapUrls = [
        `${baseUrl.origin}/sitemap.xml`,
        `${baseUrl.origin}/sitemap_index.xml`,
        `${baseUrl.origin}/sitemap`,
        `${baseUrl.origin}/robots.txt`,
      ];

      for (const sitemapUrl of possibleSitemapUrls) {
        try {
          const response = await fetch(sitemapUrl);
          if (response.ok) {
            const content = await response.text();

            // If it's robots.txt, extract sitemap URLs
            if (sitemapUrl.endsWith("robots.txt")) {
              const sitemapMatches = content.match(/^Sitemap: (.+)$/gm);
              if (sitemapMatches) {
                const extractedUrls = sitemapMatches.map((line) =>
                  line.replace("Sitemap: ", "").trim()
                );
                for (const url of extractedUrls) {
                  await processSitemap(url);
                }
              }
            } else {
              await processSitemap(sitemapUrl);
            }

            // If we successfully processed any sitemap, break the loop
            if (sitemapUrls.size > 0) break;
          }
        } catch (error) {
          log.debug("Failed to fetch possible sitemap", {
            url: sitemapUrl,
            error: (error as Error).message,
          });
          continue;
        }
      }
    } catch (error) {
      log.warning("Failed to process start URL for sitemap", {
        url: startUrl,
        error: (error as Error).message,
      });
    }
  }

  log.info("Found URLs in sitemaps", { count: sitemapUrls.size });
  log.debug("Sitemap URLs", { urls: Array.from(sitemapUrls) });
  return Array.from(sitemapUrls);
}
