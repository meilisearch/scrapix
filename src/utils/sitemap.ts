import { Log } from "crawlee";
import { XMLParser } from "fast-xml-parser";

const log = new Log({ prefix: "SitemapUtils" });

export async function extractUrlsFromSitemap(
  startUrls: string[]
): Promise<string[]> {
  log.info("Starting sitemap URL extraction", { startUrls });
  const sitemapUrls = new Set<string>();
  const processedSitemaps = new Set<string>();

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  async function processSitemap(url: string) {
    log.debug("Checking if sitemap already processed", {
      url,
      processed: processedSitemaps.has(url),
    });
    if (processedSitemaps.has(url)) return;
    processedSitemaps.add(url);
    log.debug("Added sitemap to processed set", {
      url,
      totalProcessed: processedSitemaps.size,
    });

    try {
      log.debug("Processing sitemap", { url });
      const response = await fetch(url);
      log.debug("Received response from sitemap fetch", {
        url,
        status: response.status,
        ok: response.ok,
      });

      if (!response.ok) {
        log.warning("Failed to fetch sitemap", {
          url,
          status: response.status,
          statusText: response.statusText,
        });
        return;
      }

      const content = await response.text();
      const parsed = parser.parse(content);

      // Handle sitemap index files
      if (parsed.sitemapindex?.sitemap) {
        const sitemaps = Array.isArray(parsed.sitemapindex.sitemap)
          ? parsed.sitemapindex.sitemap
          : [parsed.sitemapindex.sitemap];

        log.debug("Found sitemap index", { count: sitemaps.length });

        for (const sitemap of sitemaps) {
          const loc = sitemap.loc;
          if (typeof loc === "string") {
            await processSitemap(loc);
          }
        }
        return;
      }

      // Handle regular sitemaps
      if (parsed.urlset?.url) {
        const urls = Array.isArray(parsed.urlset.url)
          ? parsed.urlset.url
          : [parsed.urlset.url];

        log.debug("Processing found URLs", { count: urls.length });

        const previousSize = sitemapUrls.size;
        urls.forEach((urlObj: any) => {
          if (typeof urlObj.loc === "string") {
            sitemapUrls.add(urlObj.loc);
          }
        });
        const newUrls = sitemapUrls.size - previousSize;

        log.debug("Added URLs to collection", {
          url,
          totalFound: urls.length,
          newUrlsAdded: newUrls,
          totalUrlsNow: sitemapUrls.size,
        });

        // Check for nested sitemaps
        for (const urlObj of urls) {
          if (typeof urlObj.loc === "string" && urlObj.loc.endsWith(".xml")) {
            log.debug("Found nested sitemap", { url: urlObj.loc });
            await processSitemap(urlObj.loc);
          }
        }
      }
    } catch (error) {
      log.warning("Failed to process sitemap", {
        url,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  for (const startUrl of startUrls) {
    try {
      log.info("Processing start URL", { startUrl });
      const baseUrl = new URL(startUrl);
      const possibleSitemapUrls = [
        `${baseUrl.origin}/sitemap.xml`,
        `${baseUrl.origin}/sitemap.0.xml`,
        `${baseUrl.origin}/sitemap_index.xml`,
        `${baseUrl.origin}/sitemap`,
        `${baseUrl.origin}/robots.txt`,
      ];
      log.debug("Generated possible sitemap URLs", {
        baseUrl: baseUrl.origin,
        possibleUrls: possibleSitemapUrls,
      });

      for (const sitemapUrl of possibleSitemapUrls) {
        try {
          log.debug("Attempting to fetch possible sitemap", {
            url: sitemapUrl,
          });
          const response = await fetch(sitemapUrl);
          log.debug("Received response for possible sitemap", {
            url: sitemapUrl,
            status: response.status,
            ok: response.ok,
          });

          if (response.ok) {
            const content = await response.text();
            log.debug("Successfully fetched content", {
              url: sitemapUrl,
              contentLength: content.length,
            });

            // If it's robots.txt, extract sitemap URLs
            if (sitemapUrl.endsWith("robots.txt")) {
              log.debug("Processing robots.txt file", { url: sitemapUrl });
              const sitemapMatches = content.match(/^Sitemap: (.+)$/gm);
              log.debug("Found sitemap directives in robots.txt", {
                url: sitemapUrl,
                matchesFound: sitemapMatches?.length || 0,
              });

              if (sitemapMatches) {
                const extractedUrls = sitemapMatches.map((line) =>
                  line.replace("Sitemap: ", "").trim()
                );
                log.debug("Extracted sitemap URLs from robots.txt", {
                  count: extractedUrls.length,
                  urls: extractedUrls,
                });

                for (const url of extractedUrls) {
                  await processSitemap(url);
                }
              }
            } else {
              await processSitemap(sitemapUrl);
            }
          }
        } catch (error) {
          log.debug("Failed to fetch possible sitemap", {
            url: sitemapUrl,
            error: (error as Error).message,
            stack: (error as Error).stack,
          });
          continue;
        }
      }
    } catch (error) {
      log.warning("Failed to process start URL for sitemap", {
        url: startUrl,
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
    }
  }

  log.info("Completed sitemap URL extraction", {
    totalUrlsFound: sitemapUrls.size,
    totalSitemapsProcessed: processedSitemaps.size,
  });
  log.debug("Final sitemap URLs", { urls: Array.from(sitemapUrls) });
  return Array.from(sitemapUrls);
}
