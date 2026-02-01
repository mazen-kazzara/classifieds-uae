import { mockAds, isExpired } from "./data/mockAds";
export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 text-black">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <h1 className="text-2xl font-bold">
            Classified UAE
          </h1>
          <p className="text-sm text-gray-600">
            Fully automated classified ads
          </p>
        </div>
      </header>


<main className="mx-auto max-w-7xl px-4 py-6">
  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

    {["cars", "real-estate", "jobs"].map((category) => (
      <section key={category} className="border bg-white p-4">
        <h2 className="mb-3 border-b pb-2 text-lg font-semibold capitalize">
          <a href={`/category/${category}`}>{category.replace("-", " ")}</a>
        </h2>

        <ul className="space-y-2 text-sm">
          {mockAds
            .filter((ad) => ad.category === category && !isExpired(ad.expiresAt))
            .map((ad) => (
              <li key={ad.id} className="flex items-center gap-2">
  <a
    href={`/ad/${ad.id}`}
    className="text-blue-600 hover:underline"
  >
    {ad.title}
  </a>

  {ad.hasImages && (
    <span
      title="This ad contains images"
      className="text-gray-500"
    >
      📷
    </span>
  )}
</li>

            ))}
        </ul>
      </section>
    ))}

  </div>
</main>


    </div>
  );
}
