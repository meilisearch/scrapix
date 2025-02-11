import Script from "next/script";
import { Cheese } from "../interfaces/cheese";

type Props = {
  cheese: Cheese;
};

export default function ProductSchema({ cheese }: Props) {
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: cheese.name,
    description: cheese.description,
    offers: {
      "@type": "Offer",
      price: cheese.price,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    // Add specific cheese properties
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "Milk Type",
        value: cheese.milk,
      },
      {
        "@type": "PropertyValue",
        name: "Country of Origin",
        value: cheese.country,
      },
      {
        "@type": "PropertyValue",
        name: "Texture",
        value: cheese.texture,
      },
      {
        "@type": "PropertyValue",
        name: "Type",
        value: cheese.type,
      },
    ].filter((prop) => prop.value && prop.value !== "NA"),
  };

  return (
    <Script id={`product-schema-${cheese.slug}`} type="application/ld+json">
      {JSON.stringify(productSchema)}
    </Script>
  );
}
