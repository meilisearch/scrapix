import Link from "next/link";
import type { Cheese } from "@/interfaces/cheese";

type Props = {
  cheeses: Cheese[];
};

export function CheeseGrid({ cheeses }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {cheeses.map((cheese) => (
        <Link
          key={cheese.slug}
          href={`/products/${cheese.slug}`}
          className="block group"
        >
          <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-lg transition-transform duration-200 ease-in-out group-hover:scale-105">
            <h3 className="text-xl font-bold mb-2">{cheese.name}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
              {cheese.description}
            </p>
            <p className="font-bold">${cheese.price}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
