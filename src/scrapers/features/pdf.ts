import { CheerioAPI } from "cheerio";
import { Config, BlockDocument } from "../../types";
import pdfParse from "pdf-parse";

export async function processPDF($: CheerioAPI, documents: BlockDocument[], config: Config): Promise<BlockDocument[]> {
  if (!config.features || !config.features.pdf || !config.features.pdf.activated) {
    return documents;
  }

  // Update each document with PDF content
  return await Promise.all(
    documents.map(async (doc) => {
      if (!doc.url.toLowerCase().endsWith(".pdf")) {
        return doc;
      }

      try {
        const response = await fetch(doc.url);
        const buffer = await response.arrayBuffer();
        const pdf = await pdfParse(Buffer.from(buffer));

        return {
          ...doc,
          content: config.features!.pdf!.extract_content ? pdf.text : undefined,
          total_pages: pdf.numpages,
          metadata: config.features!.pdf!.extract_metadata ? extractMetadata(pdf) : undefined
        };
      } catch (error) {
        console.error("PDF extraction failed:", error);
        return doc;
      }
    })
  );
}

function extractMetadata(pdf: any) {
  const info = pdf.info;
  return {
    title: info.Title,
    author: info.Author,
    subject: info.Subject,
    keywords: info.Keywords,
    creator: info.Creator,
    producer: info.Producer,
    created_date: info.CreationDate,
    modified_date: info.ModDate
  };
} 