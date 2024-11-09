import * as dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { Sender } from "../sender";
import { Crawler } from "../crawlers";
import { Config } from "../types";

function getConfig({
  configPath,
  config,
}: {
  configPath?: string;
  config?: string;
}): Config {
  if (configPath) {
    return JSON.parse(
      fs.readFileSync(configPath, { encoding: "utf-8" })
    ) as Config;
  } else if (config) {
    return JSON.parse(config) as Config;
  }

  throw new Error("Please provide either --config or --configPath");
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
  // Parse command line arguments and get a configuration file path
  const argv = await yargs(hideBin(process.argv))
    .option("config", {
      alias: "c",
      describe: "configuration",
      type: "string",
    })
    .option("configPath", {
      alias: "p",
      describe: "Path to configuration file",
      type: "string",
    })
    .option("browserPath", {
      alias: "b",
      describe: "Path to browser binary",
      type: "string",
    })
    .check((argv) => {
      if (argv.config && argv.configPath) {
        throw new Error(
          "You can only use either --config or --configPath, not both."
        );
      } else if (!argv.config && !argv.configPath) {
        throw new Error("You must provide one of --config or --configPath.");
      }
      return true;
    }).argv;

  const config = getConfig(argv);
  const launchOptions = argv.browserPath
    ? { executablePath: argv.browserPath }
    : {};

  const sender = new Sender(config);
  await sender.init();

  const crawler = await Crawler.create(
    config.crawler_type || "cheerio",
    sender,
    config,
    config.launch_options || launchOptions
  );

  await Crawler.run(crawler);
  await sender.finish();
})();
