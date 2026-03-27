export const dynamic = "force-dynamic";
import { PrismaClient } from "@prisma/client";
import Link from "next/link";

const prisma = new PrismaClient();

export default async function Home() {
  const now = new Date();

  const ads = await prisma.ad.findMany({
    where: {
      status: "PUBLISHED",
      expiresAt: { gt: now },

      // safer filtering
      title: {
        not: "",
      },
      description: {
        not: "",
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // normalize categories (VERY IMPORTANT)
  const normalize = (v: string) => v.trim().toLowerCase();

  const vehicles = ads.filter(
    (a) => normalize(a.category) === "vehicles"
  );

  const properties = ads.filter(
    (a) => normalize(a.category) === "real estate"
  );

  const electronics = ads.filter(
    (a) => normalize(a.category) === "electronics"
  );

  function Column({
    title,
    items,
  }: {
    title: string;
    items: typeof ads;
  }) {
    return (
      <section className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-lg font-bold mb-4 border-b pb-2 text-blue-600">
          {title}
        </h2>

        <div className="space-y-3">
          {items.length === 0 && (
            <p className="text-sm text-gray-400">No ads yet</p>
          )}

          {items.map((ad) => (
            <Link
              key={ad.id}
              href={`/ad/${ad.id}`}
              className="block border rounded-lg p-3 hover:shadow-md hover:border-blue-400 transition"
            >
              <h3 className="font-semibold text-gray-800">
                {ad.title}
              </h3>

              <p className="text-xs text-gray-500 mt-1">
                {new Date(ad.createdAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">
              Classified UAE
            </h1>

            <p className="text-sm text-gray-500">
              Post fast. Pay once. Go live instantly.
            </p>
          </div>

          <Link
            href="/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
          >
            + Post New Ad
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid gap-6 md:grid-cols-3">
          <Column title="Vehicles" items={vehicles} />
          <Column title="Real Estate" items={properties} />
          <Column title="Electronics" items={electronics} />
        </div>
      </main>

      <footer className="border-t bg-white mt-10">
        <div className="max-w-7xl mx-auto px-6 py-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Classified UAE — MVP
        </div>
      </footer>
    </div>
  );
}