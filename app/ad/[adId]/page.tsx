export const dynamic = "force-dynamic";

import { PrismaClient } from "@prisma/client";
import { notFound } from "next/navigation";

const prisma = new PrismaClient();

export default async function AdPage(
  props: { params: Promise<{ adId: string }> }
) {
  const { adId } = await props.params;
  const decodedAdId = decodeURIComponent(adId);

  const ad = await prisma.ad.findUnique({
    where: { id: decodedAdId },
    include: {
      media: {
        orderBy: { position: "asc" },
      },
      submission: true, // needed for contact info
    },
  });

  if (!ad) notFound();

  const expired = ad.expiresAt < new Date();

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow p-6">

        {/* Expired Banner */}
        {expired && (
          <div className="mb-4 p-3 bg-red-50 border border-red-300 text-red-700 text-sm rounded">
            This ad has expired.
          </div>
        )}

        {/* Title */}
        <h1 className="text-3xl font-bold mb-2">
          {ad.title || "Untitled"}
        </h1>

        <p className="text-sm text-gray-500 mb-6">
          Category: {ad.category}
        </p>

        {/* Images */}
        {ad.media.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {ad.media.map((m) => {
              const fixedUrl = m.url.startsWith("/")
                ? m.url
                : `/uploads/${m.url}`;

              return (
                <a
                  key={m.id}
                  href={fixedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img
                    src={fixedUrl}
                    alt="Ad image"
                    className="w-full h-48 object-cover rounded-lg border hover:scale-105 transition"
                  />
                </a>
              );
            })}
          </div>
        )}

        {/* Description */}
        <p className="text-gray-800 text-lg mb-6 whitespace-pre-line">
          {ad.description}
        </p>

        {/* Contact Section */}
        <div className="border-t pt-6 mt-6">

          <h2 className="font-semibold mb-3 text-lg">Contact</h2>

          <div className="flex flex-wrap gap-3">

            {/* Phone */}
            {ad.submission?.contactPhone && (
              <a
                href={`tel:${ad.submission.contactPhone}`}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
              >
                📞 Call
              </a>
            )}

            {/* Telegram */}
            {ad.submission?.telegramChatId && (
              <a
                href={`https://t.me/${ad.submission.telegramChatId}`}
                target="_blank"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                💬 Telegram
              </a>
            )}

          </div>

        </div>

        {/* Meta */}
        <div className="text-xs text-gray-500 border-t pt-4 mt-6 space-y-1">
          <p>Ad ID: {ad.id}</p>
          <p>Published: {ad.publishedAt?.toISOString()}</p>
          <p>Expires: {ad.expiresAt.toISOString()}</p>
        </div>

      </div>
    </div>
  );
}