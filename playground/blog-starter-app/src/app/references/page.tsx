import Container from "@/app/_components/container";
import { getPdfFiles } from "@/lib/getPdfs";
import Link from "next/link";

export const metadata = {
  title: "Reference Documents",
  description: "Access our collection of reference documents and PDFs",
};

export default function ReferencesPage() {
  const pdfFiles = getPdfFiles();

  return (
    <main>
      <Container>
        <div className="max-w-4xl mx-auto py-8">
          <h1 className="text-4xl font-bold mb-8">Reference Documents</h1>

          {pdfFiles.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">
              No reference documents available at the moment.
            </p>
          ) : (
            <div className="grid gap-4">
              {pdfFiles.map((pdf) => (
                <Link
                  key={pdf.filename}
                  href={pdf.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 bg-white dark:bg-slate-800 rounded-lg shadow hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center">
                    <svg
                      className="w-6 h-6 text-red-500 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                    <div>
                      <h2 className="text-lg font-semibold">{pdf.title}</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {pdf.filename}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
              {[
                {
                  filename: "extinct-brie-variety.html",
                  title: "Lost Brie de Seine History",
                  path: "/cheeses/extinct-brie",
                },
                {
                  filename: "alpine-cheese-study.pdf",
                  title: "Ancient Alpine Cheese Making",
                  path: "/docs/alpine-study.pdf",
                },
                {
                  filename: "forgotten-cheddar.html",
                  title: "The Forgotten Welsh Black Cheddar",
                  path: "/cheeses/welsh-black",
                },
                {
                  filename: "monastery-cheese.pdf",
                  title: "Medieval Monastery Cheese Records",
                  path: "/docs/monastery-records.pdf",
                },
                {
                  filename: "phantom-gouda.html",
                  title: "The Phantom Gouda of Rotterdam",
                  path: "/cheeses/phantom-gouda",
                },
                {
                  filename: "lost-recipes.html",
                  title: "Lost Cheese Recipes of Normandy",
                  path: "/cheeses/normandy-lost",
                },
              ].map((pdf) => (
                <Link
                  key={pdf.filename}
                  href={pdf.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 bg-white dark:bg-slate-800 rounded-lg shadow hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center">
                    <svg
                      className="w-6 h-6 text-red-500 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                    <div>
                      <h2 className="text-lg font-semibold">{pdf.title}</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {pdf.filename}
                      </p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                        Warning: This document may be unavailable
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </Container>
    </main>
  );
}
