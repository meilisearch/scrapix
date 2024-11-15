import Link from "next/link";

export default function MainNav() {
  return (
    <nav className="flex items-center justify-between max-w-4xl p-4 mx-auto">
      <div className="flex space-x-4">
        <Link href="/" className="hover:underline">
          Blog
        </Link>
        <Link href="/products" className="hover:underline">
          Products
        </Link>
      </div>
    </nav>
  );
}
