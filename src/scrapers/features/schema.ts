import { CheerioAPI } from "cheerio";
import { Config, FullPageDocument } from "../../types";

export async function processSchema($: CheerioAPI, document: FullPageDocument, config: Config): Promise<FullPageDocument> {
  if (!config.features || !config.features.schema || !config.features.schema.activated) {
    return document;
  }


  // Get the schema.org data
  const schemaScript = $('script[type="application/ld+json"]');
  let schemaData: Record<string, any> = {};

  if (schemaScript.length > 0) {
    try {
      schemaData = JSON.parse(schemaScript.html() || "{}");
    } catch (error) {
      console.error("Failed to parse JSON-LD schema:", error);
      return document;
    }
  }

  if (Object.keys(schemaData).length === 0) {
    return document;
  }

  // Filter by type if specified
  if (config.features.schema.only_type && schemaData["@type"] !== config.features.schema.only_type) {
    return document;
  }

  // Clean schema data
  cleanSchema(schemaData);

  // Convert dates if enabled
  if (config.features.schema.convert_dates) {
    convertDates(schemaData);
  }

  return {
    ...document,
    schema: schemaData
  };
}

function cleanSchema(data: Record<string, any>) {
  if (data["@context"]) {
    delete data["@context"];
  }
  if (data["@type"]) {
    delete data["@type"];
  }
  Object.keys(data).forEach((key) => {
    if (typeof data[key] === "object") {
      cleanSchema(data[key]);
    }
  });
}

function convertDates(data: Record<string, any>) {
  Object.keys(data).forEach((key) => {
    if (typeof data[key] === "string") {
      const timestamp = Date.parse(data[key]);
      if (!isNaN(timestamp)) {
        data[key] = timestamp;
      }
    } else if (typeof data[key] === "object") {
      convertDates(data[key]);
    }
  });
} 