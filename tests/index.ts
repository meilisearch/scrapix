import { performance } from "perf_hooks";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { MeiliSearch } from "meilisearch";
import minimist from "minimist";
import { minimatch } from "minimatch";
import log from "@apify/log";
interface TestResult {
  name: string;
  documentCount: number;
  executionTime: number;
  exitCode: number;
}

interface TestConfig {
  name: string;
  path: string;
  content: Record<string, any>;
}

function getTestConfigs(pattern?: string): TestConfig[] {
  const configDir = path.join(__dirname, "../../misc/config_tests");
  let configFiles = fs
    .readdirSync(configDir)
    .filter((file) => !file.startsWith("-") && file.endsWith(".json"));

  if (pattern) {
    configFiles = configFiles.filter((file) =>
      minimatch(file, pattern, { nocase: true })
    );
  }

  const configs = configFiles.map((file) => {
    const content = JSON.parse(
      fs.readFileSync(path.join(configDir, file), "utf-8")
    );
    return {
      name: path.basename(file, ".json"),
      path: path.join(configDir, file),
      content,
    };
  });

  return configs;
}

function runCrawlerWithMetrics(
  config: TestConfig
): [Promise<TestResult>, () => string] {
  const start = performance.now();
  let latestOutput = "";

  const getLatestOutput = () => latestOutput;

  const resultPromise = new Promise<TestResult>((resolve, reject) => {
    const crawlerProcess = exec(
      `ts-node src/bin/index.ts --configPath ${config.path}`
    );

    crawlerProcess.stdout?.on("data", (data) => {
      latestOutput = data.toString().trim().split("\n").pop() || "";
      log.warning(`last output: ${latestOutput}`);
    });

    crawlerProcess.stderr?.on("data", (data) => {
      latestOutput = data.toString().trim().split("\n").pop() || "";
      log.warning(`last output: ${latestOutput}`);
    });

    crawlerProcess.on("close", async (code) => {
      const end = performance.now();
      const executionTime = end - start;

      try {
        const stats = await verifyMeilisearchContent(config.content);
        resolve({
          name: config.name,
          documentCount: stats.numberOfDocuments,
          executionTime,
          exitCode: code ?? 0,
        });
      } catch (error) {
        log.warning(`last output: ${latestOutput}`);
        reject(error);
        // reject(`Process exited with code ${code}: ${error} - ${latestOutput}`);
      }
    });
  });

  return [resultPromise, getLatestOutput];
}

async function verifyMeilisearchContent(configContent: Record<string, any>) {
  const client = new MeiliSearch({
    host: configContent.meilisearch_url,
    apiKey: configContent.meilisearch_api_key,
  });

  const index = client.index(configContent.meilisearch_index_uid);
  const stats = await index.getStats();

  return stats;
}

async function runAllTests(pattern?: string) {
  const startTime = performance.now();
  const testConfigs = getTestConfigs(pattern);

  if (testConfigs.length === 0) {
    console.log(
      `No test configurations found${pattern ? ` matching pattern: ${pattern}` : ""}`
    );
    return;
  }

  const results = {
    timestamp: new Date().toISOString(),
    configs: [] as TestResult[],
    totalExecutionTime: 0,
  };

  const loaderFrames = ["|", "/", "-", "\\"];
  let loaderIndex = 0;

  const terminalWidth = process.stdout.columns || 80; // Get terminal width, default to 80 if not available

  const updateLine = (message: string) => {
    const truncatedMessage =
      message.length > terminalWidth ?
        message.slice(0, terminalWidth - 3) + "..."
      : message.padEnd(terminalWidth, " ");
    process.stdout.write(`\r${truncatedMessage}`);
  };

  for (const config of testConfigs) {
    process.stdout.write(`Running test for configuration: ${config.name} `);
    const [resultPromise, getLatestOutput] = runCrawlerWithMetrics(config);

    const spinner = setInterval(() => {
      const frame = loaderFrames[loaderIndex];
      updateLine(`${frame} ${config.name} - ${getLatestOutput()}`);
      loaderIndex = (loaderIndex + 1) % loaderFrames.length;
    }, 100);

    try {
      const result = await resultPromise;

      clearInterval(spinner);
      updateLine(
        `✔ ${config.name} (${result.executionTime.toFixed(2)} ms, ${result.documentCount} docs)`
      );
      process.stdout.write("\n"); // Move to the next line after completion

      results.configs.push(result);
    } catch (error) {
      clearInterval(spinner);
      updateLine(`✘ ${config.name} (failed) - ${error}`);
      process.stdout.write("\n"); // Move to the next line after failure

      results.configs.push({
        name: config.name,
        documentCount: 0,
        executionTime: 0,
        exitCode: 1,
      });
    }
  }

  const endTime = performance.now();
  results.totalExecutionTime = endTime - startTime;

  // Save results to a file
  const resultsDir = path.join(__dirname, "../test-results");
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir);
  }
  const fileName = `test-results-${results.timestamp.replace(/:/g, "-")}.json`;
  fs.writeFileSync(
    path.join(resultsDir, fileName),
    JSON.stringify(results, null, 2)
  );

  console.log("All tests completed. Results saved to:", fileName);
  console.log("\nSummary:");
  console.log(
    `Total execution time: ${results.totalExecutionTime.toFixed(2)} ms`
  );

  for (const configResult of results.configs) {
    console.log(`\nConfiguration: ${configResult.name}`);
    console.log(`Documents count: ${configResult.documentCount}`);
    console.log(`Execution time: ${configResult.executionTime.toFixed(2)} ms`);
    console.log(`Exit code: ${configResult.exitCode}`);
  }
}

// Update DockerMeilisearch interface to DockerServices
interface DockerServices {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  waitForServices: () => Promise<void>;
}

// Update the docker management function
function createDockerServices(): DockerServices {
  return {
    start: () => {
      return new Promise<void>((resolve, reject) => {
        console.log("Starting services via Docker...");

        exec("which docker", async (error) => {
          if (error) {
            reject(new Error("Docker is not installed or not in PATH"));
            return;
          }

          const dockerCommand = await new Promise<string>((resolveCommand) => {
            exec("docker compose version", (error) => {
              if (!error) {
                resolveCommand("docker compose");
              } else {
                exec("docker-compose version", (error) => {
                  resolveCommand(error ? "none" : "docker-compose");
                });
              }
            });
          });

          if (dockerCommand === "none") {
            reject(new Error("Docker Compose not found"));
            return;
          }

          const process = exec(
            `${dockerCommand} -f docker-compose.test.yml up -d`,
            {
              cwd: path.join(__dirname, "../.."),
            }
          );

          process.stderr?.on("data", (data) => {
            console.error(`Docker stderr: ${data}`);
          });

          process.on("close", (code) => {
            if (code !== 0) {
              reject(new Error(`Docker compose exited with code ${code}`));
              return;
            }
            resolve();
          });
        });
      });
    },

    waitForServices: async () => {
      console.log("Waiting for services to be ready...");

      // Wait for Meilisearch
      let retries = 30;
      while (retries > 0) {
        try {
          await fetch("http://localhost:7700/health");
          console.log("Meilisearch is ready");
          break;
        } catch (e) {
          retries--;
          if (retries === 0) {
            throw new Error("Meilisearch failed to start");
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
          console.log("Waiting for Meilisearch...");
        }
      }

      // Wait for playground-app
      retries = 30;
      while (retries > 0) {
        try {
          await fetch("http://localhost:3000");
          console.log("Blog app is ready");
          break;
        } catch (e) {
          retries--;
          if (retries === 0) {
            throw new Error("Blog app failed to start");
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
          console.log("Waiting for blog app...");
        }
      }
    },

    stop: () => {
      return new Promise<void>((resolve, reject) => {
        console.log("Stopping services...");
        exec("docker compose -f docker-compose.test.yml down", (error) => {
          if (!error) {
            resolve();
          } else {
            exec("docker-compose -f docker-compose.test.yml down", (error) => {
              if (error) {
                reject(error);
              } else {
                resolve();
              }
            });
          }
        });
      });
    },
  };
}

// Update main execution
const argv = minimist(process.argv.slice(2));
const pattern = argv.pattern || argv.p;

async function main() {
  const docker = createDockerServices();

  try {
    // Only start Docker if we're not in CI
    if (!process.env.GITHUB_ACTIONS) {
      await docker.start();
      await docker.waitForServices();
    }

    await runAllTests(pattern);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    // Only stop Docker if we're not in CI
    if (!process.env.GITHUB_ACTIONS) {
      await docker.stop();
    }
  }
}

main().catch(console.error);
