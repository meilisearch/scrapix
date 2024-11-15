import Container from "@/app/_components/container";
import { CheeseGrid } from "@/app/_components/cheese-grid";
import { Pagination } from "@/app/_components/pagination";
import { getAllCheeses } from "@/lib/cheeses";

type Props = {
  searchParams?: {
    page?: string;
  };
};

const ITEMS_PER_PAGE = 24;

// Add generateStaticParams to generate all possible page combinations
export function generateStaticParams() {
  const allCheeses = getAllCheeses();
  const totalPages = Math.ceil(allCheeses.length / ITEMS_PER_PAGE);

  // Generate array of page numbers from 1 to totalPages
  return Array.from({ length: totalPages }, (_, i) => ({
    searchParams: { page: (i + 1).toString() },
  }));
}

// Add generateMetadata for better SEO
export async function generateMetadata({ searchParams }: Props) {
  const { page } = (await searchParams) || {};
  const currentPage = Number(page) || 1;
  return {
    title:
      currentPage === 1 ? "Our Products" : `Our Products - Page ${currentPage}`,
  };
}

// Make the page static by removing 'async' and fixing searchParams
export default async function ProductsPage({ searchParams }: Props) {
  const { page } = (await searchParams) || {};
  const currentPage = Number(page) || 1;
  const allCheeses = getAllCheeses();

  const totalPages = Math.ceil(allCheeses.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentCheeses = allCheeses.slice(startIndex, endIndex);

  return (
    <main>
      <Container>
        <h1 className="text-4xl font-bold mb-8">Our Products</h1>
        <CheeseGrid cheeses={currentCheeses} />
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          baseUrl="/products"
        />
      </Container>
    </main>
  );
}
