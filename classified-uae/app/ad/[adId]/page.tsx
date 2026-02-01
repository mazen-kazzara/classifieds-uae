"use client";

import { useParams } from "next/navigation";
import { mockAds, isExpired } from "../../data/mockAds";

export default function AdPage() {
  const params = useParams();
  const adId = typeof params?.adId === "string" ? params.adId : "";

  const ad = mockAds.find((item) => item.id === adId);

  if (!ad) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-4xl bg-white p-6 border">
          <h1 className="text-xl font-bold mb-2">Ad not found</h1>
          <p className="text-sm text-gray-600">
            This ad does not exist or has expired
          </p>
        </div>
      </div>
    );
  }

  const expired = isExpired(ad.expiresAt);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-4xl bg-white p-6 border">
        {expired && (
          <div className="mb-4 border border-red-400 bg-red-50 p-3 text-sm text-red-700">
            This ad has expired and is no longer visible on the website.
          </div>
        )}

        <h1 className="text-xl font-bold mb-2">{ad.title}</h1>

        <p className="text-sm text-gray-600 mb-4">Category: {ad.category}</p>

        <p className="mb-4 text-gray-800">{ad.text}</p>

        <div className="border-t pt-4 text-sm text-gray-700">
          <p>Ad ID: {ad.id}</p>
          <p>Published: {ad.createdAt}</p>
          <p>Expires: {ad.expiresAt}</p>
        </div>
      </div>
    </div>
  );
}
