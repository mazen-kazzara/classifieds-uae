"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { mockAds, isExpired } from "../../data/mockAds";
import AdListItem from "../../components/AdListItem";

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
              <AdListItem
                key={ad.id}
                id={ad.id}
                title={ad.title}
                hasImages={ad.hasImages}
                onImageClick={() => {
                  setActiveAd(ad.id);
                  setOpen(true);
                }}
              />
            ))}
          </ul>
        )}
      </div>

      {/* IMAGE MODAL */}
      {open && activeAd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md bg-white p-6 border">
            <h2 className="mb-4 text-lg font-bold">
  Ad Images
</h2>

<div className="mb-4 grid grid-cols-2 gap-3">
  {mockAds
    .find((ad) => ad.id === activeAd)
    ?.images?.map((src, index) => (
      <img
        key={index}
        src={src}
        alt={`Ad image ${index + 1}`}
        className="h-32 w-full object-cover border"
      />
    ))}
</div>

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
