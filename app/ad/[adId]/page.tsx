export const dynamic = "force-dynamic";

import { PrismaClient } from "@prisma/client";
import { notFound } from "next/navigation";

const prisma = new PrismaClient();

export default async function AdPage(
  props: { params: Promise<{ adId: string }> }
) {
  const { adId } = await props.params;

  if (!adId) {
    notFound();
  }

  const ad = await prisma.ad.findUnique({
    where: { id: adId },
    include: {
      media: {
        orderBy: { position: "asc" },
      },
    },
  });

  if (!ad || ad.status !== "PUBLISHED") {
    notFound();
  }

  const expired = ad.expiresAt < new Date();

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-4xl bg-white p-6 rounded-xl shadow">

        {expired && (
          <div className="mb-4 p-3 bg-red-50 border border-red-300 text-red-700 text-sm rounded">
            This ad has expired.
          </div>
        )}

        <h1 className="text-2xl font-bold mb-2">
          {ad.title || "Untitled"}
        </h1>

        <p className="text-sm text-gray-500 mb-4">
          Category: {ad.category}
        </p>

        {/* Images */}
        {ad.media.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {ad.media.map((m) => {
              const fixedUrl = m.url.startsWith("/")
                ? m.url
                : `/uploads/${m.url}`;

              return (
                <img
                  key={m.id}
                  src={fixedUrl}
                  alt="Ad image"
                  className="rounded-lg border shadow-sm object-cover w-full"
                />
              );
            })}
          </div>
        )}

        <p className="text-gray-800 mb-6 whitespace-pre-line">
          {ad.description}
        </p>

        <div className="text-xs text-gray-500 border-t pt-4 space-y-1">
          <p>Ad ID: {ad.id}</p>
          <p>Published: {ad.publishedAt?.toISOString()}</p>
          <p>Expires: {ad.expiresAt.toISOString()}</p>
        </div>

      </div>
    </div>
  );
}