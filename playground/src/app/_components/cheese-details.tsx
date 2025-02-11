"use client";

import { Cheese } from "../interfaces/cheese";
import { useState, useEffect } from "react";

type Props = {
  cheese: Cheese;
};

export default function CheeseDetails({ cheese }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const excludedProperties = ["slug", "name", "description", "price"];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const details = Object.entries(cheese)
    .filter(
      ([key, value]) =>
        !excludedProperties.includes(key) && value !== "NA" && value !== ""
    )
    .map(([key, value]) => ({
      key: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      value: typeof value === "boolean" ? String(value) : value,
    }));

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="border p-4 rounded-lg animate-pulse bg-gray-100 dark:bg-gray-800"
          >
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mt-2"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
      {details.map(({ key, value }) => (
        <div key={key} className="border p-4 rounded-lg">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {key}
          </dt>
          <dd className="mt-1 text-lg text-gray-900 dark:text-gray-100">
            {value}
          </dd>
        </div>
      ))}
    </div>
  );
}
