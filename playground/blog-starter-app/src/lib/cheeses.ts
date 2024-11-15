import type { Cheese } from "@/interfaces/cheese";
import cheeses from "../../_data/cheeses.json";

function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[']/g, "") // Remove single quotes
    .replace(/[^a-z0-9]+/g, "-") // Replace any non-alphanumeric chars with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

export function getAllCheeses(): Cheese[] {
  return cheeses.map((cheese) => ({
    slug: createSlug(cheese.cheese),
    name: cheese.cheese,
    description: `${cheese.cheese} is a ${cheese.type} cheese from ${cheese.country}`,
    price: Number(
      (
        (parseInt(
          cheese.url
            .split("")
            .map((c) => c.charCodeAt(0))
            .join("")
        ) %
          1000) /
        100
      ).toFixed(2)
    ),
    ...cheese,
  }));
}

export function getCheeseBySlug(slug: string): Cheese | undefined {
  const cheese = cheeses.find(
    (cheese) => createSlug(cheese.cheese) === slug.toLowerCase()
  );
  if (!cheese) return undefined;
  return {
    slug: createSlug(cheese.cheese),
    name: cheese.cheese,
    description: `${cheese.cheese} is a ${cheese.type} cheese from ${cheese.country}`,
    price: Number(
      (
        (parseInt(
          cheese.url
            .split("")
            .map((c) => c.charCodeAt(0))
            .join("")
        ) %
          1000) /
        100
      ).toFixed(2)
    ),
    ...cheese,
  };
}

export function getPaginatedCheeses(page: number, itemsPerPage: number) {
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  return {
    cheeses: cheeses.slice(startIndex, endIndex),
    totalPages: Math.ceil(cheeses.length / itemsPerPage),
  };
}
