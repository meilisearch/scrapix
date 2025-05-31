import Container from "@/app/_components/container";
import { getAllCheeses, getCheeseBySlug } from "@/lib/cheeses";
import { notFound } from "next/navigation";
import CheeseDetails from "@/app/_components/cheese-details";
import ProductSchema from "@/app/_components/product-schema";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  const cheeses = getAllCheeses();
  return cheeses.map((cheese) => ({
    slug: cheese.slug.toLowerCase(),
  }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const cheese = getCheeseBySlug(slug);

  if (!cheese) {
    return {
      title: "Product Not Found",
    };
  }

  return {
    title: cheese.name,
    description: cheese.description,
  };
}

export default async function CheesePage({ params }: Props) {
  const { slug } = await params;
  const cheese = getCheeseBySlug(slug);

  if (!cheese) {
    notFound();
  }

  return (
    <main>
      <ProductSchema cheese={cheese} />
      <Container>
        <article className="mb-32">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold mt-8 mb-4">{cheese.name}</h1>
            <div className="mb-6 text-lg">
              <p className="font-bold mb-4">Price: ${cheese.price}</p>
              <p className="text-gray-600 dark:text-gray-300 mb-8">
                {cheese.description}
              </p>
              <CheeseDetails cheese={cheese} />
            </div>
            {cheese.country === "France" && (
              <div id="french-cheese-warning" className="mt-8">
                <p className="text-lg font-bold signature">
                  PAS MAL NON ? C'est français.
                </p>
              </div>
            )}
          </div>
        </article>
      </Container>
    </main>
  );
}
