import Link from "next/link";
import cn from "classnames";

type Props = {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
};

export function Pagination({ currentPage, totalPages, baseUrl }: Props) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const delta = 2; // Pages to show before and after current page

    // Always add page 1
    pages.push(1);

    // Calculate range
    const rangeStart = Math.max(2, currentPage - delta);
    const rangeEnd = Math.min(totalPages - 1, currentPage + delta);

    // Add first ellipsis if needed
    if (rangeStart > 2) {
      pages.push("...");
    }

    // Add range pages
    for (let i = rangeStart; i <= rangeEnd; i++) {
      pages.push(i);
    }

    // Add last ellipsis if needed
    if (rangeEnd < totalPages - 1) {
      pages.push("...");
    }

    // Add last page if not already included
    if (totalPages !== 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex justify-center space-x-2 my-8">
      {currentPage > 1 && (
        <Link
          href={`${baseUrl}?page=${currentPage - 1}`}
          className="px-4 py-2 bg-white dark:bg-slate-800 rounded-lg shadow hover:bg-gray-50 dark:hover:bg-slate-700"
        >
          Previous
        </Link>
      )}

      {getPageNumbers().map((pageNum, index) =>
        pageNum === "..." ? (
          <span key={`ellipsis-${index}`} className="px-4 py-2">
            ...
          </span>
        ) : (
          <Link
            key={`page-${pageNum}`}
            href={`${baseUrl}?page=${pageNum}`}
            className={cn(
              "px-4 py-2 rounded-lg",
              pageNum === currentPage
                ? "bg-blue-500 text-white"
                : "bg-white dark:bg-slate-800 shadow hover:bg-gray-50 dark:hover:bg-slate-700"
            )}
          >
            {pageNum}
          </Link>
        )
      )}

      {currentPage < totalPages && (
        <Link
          href={`${baseUrl}?page=${currentPage + 1}`}
          className="px-4 py-2 bg-white dark:bg-slate-800 rounded-lg shadow hover:bg-gray-50 dark:hover:bg-slate-700"
        >
          Next
        </Link>
      )}
    </div>
  );
}
