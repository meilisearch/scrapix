import fs from "fs";
import path from "path";

export interface PdfFile {
  filename: string;
  title: string;
  path: string;
}

export function getPdfFiles(): PdfFile[] {
  const pdfDirectory = path.join(process.cwd(), "public/assets/pdfs/");

  // Create directory if it doesn't exist
  if (!fs.existsSync(pdfDirectory)) {
    fs.mkdirSync(pdfDirectory, { recursive: true });
    return [];
  }

  const filenames = fs.readdirSync(pdfDirectory);

  return filenames
    .filter((filename) => filename.endsWith(".pdf"))
    .map((filename) => ({
      filename,
      // Convert filename to title (remove .pdf and replace dashes/underscores with spaces)
      title: filename.replace(".pdf", "").replace(/[-_]/g, " "),
      path: `/assets/pdfs/${filename}`,
    }));
}
