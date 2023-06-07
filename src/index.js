import * as dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import yargs from "yargs";
import Sender from "./sender.js";
import Crawler from "./crawler.js";

const argv = yargs.option("config", {
  alias: "c",
  describe: "Path to configuration file",
  demandOption: true,
  type: "string",
}).argv;

const config = JSON.parse(fs.readFileSync(argv.config));

const sender = new Sender(config);
await sender.init();

const crawler = new Crawler(sender, config);

await crawler.run();
await sender.finish();
