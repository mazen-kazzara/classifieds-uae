"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { mockAds, isExpired } from "../../data/mockAds";


export default function CategoryPage() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const [open, setOpen] = useState(false);
  const [activeAd, setActiveAd] = useState<string | null>(null);




  const ads = mockAds.filter(
  (ad) => ad.category === slug && !isExpired(ad.expiresAt)
);


  const title =
    slug.length > 0 ? slug.replace("-", " ") : "Category";

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-5xl bg-white p-6 border">
        <h1 className="mb-4 text-2xl font-bold capitalize">
          {title}
        </h1>

        {ads.length === 0 ? (
          <p className="text-sm text-gray-500">
            No ads found for this category
          </p>
        ) : (
          <ul className="space-y-3 text-sm">
            {ads.map((ad) => (
              <li key={ad.id} className="flex items-center gap-2">
  <a
    href={`/ad/${ad.id}`}
    className="text-blue-600 hover:underline"
  >
    {ad.title}
  </a>

  {ad.hasImages && (
  <button
    type="button"
    title="This ad contains images"
    className="text-gray-500"
    onClick={() => {
      setActiveAd(ad.id);
      setOpen(true);
    }}
  >
    📷
  </button>
)}

</li>


            ))}
          </ul>
        )}
      </div>
      {open && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="w-full max-w-md bg-white p-6 border">
      <h2 className="mb-2 text-lg font-bold">
        Images placeholder
      </h2>

      <p className="mb-4 text-sm text-gray-600">
        Images for ad: {activeAd}
      </p>

      <button
        className="border px-4 py-2 text-sm"
        onClick={() => {
          setOpen(false);
          setActiveAd(null);
        }}
      >
        Close
      </button>
    </div>
  </div>
)}

    </div>
  );
}
