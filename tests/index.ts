import { performance } from "perf_hooks";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { MeiliSearch } from "meilisearch";
import minimist from "minimist";
import { minimatch } from "minimatch";

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
    });

    crawlerProcess.stderr?.on("data", (data) => {
      latestOutput = data.toString().trim().split("\n").pop() || "";
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
        reject(error);
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
      message.length > terminalWidth
        ? message.slice(0, terminalWidth - 3) + "..."
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
      updateLine(`✘ ${config.name} (failed)`);
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

// Main execution
const argv = minimist(process.argv.slice(2));
const pattern = argv.pattern || argv.p;

runAllTests(pattern).catch(console.error);
