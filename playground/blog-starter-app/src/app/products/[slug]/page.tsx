import Container from "@/app/_components/container";
import { getAllCheeses, getCheeseBySlug } from "@/lib/cheeses";
import { notFound } from "next/navigation";

type Props = {
  params: {
    slug: string;
  };
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
      <Container>
        <article className="mb-32">
          <h1 className="text-4xl font-bold mb-4">{cheese.name}</h1>
          <div className="max-w-2xl mx-auto">
            <div className="mb-6 text-lg">
              <p className="font-bold mb-4">Price: ${cheese.price}</p>
              <p className="text-gray-600 dark:text-gray-300">
                {cheese.description}
              </p>
            </div>
          </div>
        </article>
      </Container>
    </main>
  );
}
