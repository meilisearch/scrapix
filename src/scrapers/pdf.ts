import { Log } from "crawlee";
import { v4 as uuidv4 } from "uuid";
import pdfParse from "pdf-parse";
import { Config } from "../types";
import { Sender } from "../sender";
import { CheerioAPI } from "cheerio";

const log = new Log({ prefix: "PDFScraper" });

interface PDFDocument {
  uid: string;
  url: string;
  title?: string;
  content: string;
  page_number?: number;
  total_pages?: number;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    creator?: string;
    producer?: string;
    created_date?: string;
    modified_date?: string;
  };
}

export default class PDFScraper {
  sender: Sender;
  settings: Config["meilisearch_settings"];
  splitPerPage: boolean;
  extractMetadata: boolean;

  constructor(sender: Sender, config: Config) {
    log.info("Initializing PDFScraper", { config });
    this.sender = sender;
    this.splitPerPage = config.pdf_settings?.split_per_page ?? false;
    this.extractMetadata = config.pdf_settings?.extract_metadata ?? true;

    this.settings = config.meilisearch_settings || {
      searchableAttributes: ["title", "content"],
      filterableAttributes: ["page_number", "total_pages"],
      sortableAttributes: ["page_number"],
      distinctAttribute: "url",
    };

    void this.sender.updateSettings(this.settings);
  }
  async get(url: string, _: CheerioAPI) {
    try {
      log.debug("Starting PDF extraction", { url });

      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      const pdf = await pdfParse(Buffer.from(buffer));

      if (this.splitPerPage) {
        // Extract each page separately
        for (let i = 0; i < pdf.numpages; i++) {
          const pageText = await this._extractPageText(
            Buffer.from(buffer),
            i + 1
          );
          await this._addData({
            uid: uuidv4(),
            url: `${url}#page=${i + 1}`,
            content: pageText,
            page_number: i + 1,
            total_pages: pdf.numpages,
            metadata: this.extractMetadata
              ? this._extractMetadata(pdf)
              : undefined,
          });
        }
      } else {
        // Extract entire PDF as one document
        await this._addData({
          uid: uuidv4(),
          url,
          content: pdf.text,
          total_pages: pdf.numpages,
          metadata: this.extractMetadata
            ? this._extractMetadata(pdf)
            : undefined,
        });
      }

      log.info("PDF extraction completed", { url });
    } catch (error) {
      log.error("PDF extraction failed", { error, url });
    }
  }

  private async _extractPageText(
    buffer: Buffer,
    pageNum: number
  ): Promise<string> {
    const options = {
      pagerender: (pageData: any) => pageData.getTextContent(),
      max: pageNum,
      min: pageNum,
    };
    const data = await pdfParse(buffer, options);
    return data.text;
  }

  private _extractMetadata(pdf: any) {
    const info = pdf.info;
    return {
      title: info.Title,
      author: info.Author,
      subject: info.Subject,
      keywords: info.Keywords,
      creator: info.Creator,
      producer: info.Producer,
      created_date: info.CreationDate,
      modified_date: info.ModDate,
    };
  }

  private async _addData(data: PDFDocument) {
    try {
      await this.sender.add(data);
      log.debug("Document added successfully", { url: data.url });
    } catch (error) {
      log.error("Failed to add document", { error, url: data.url });
    }
  }
}
