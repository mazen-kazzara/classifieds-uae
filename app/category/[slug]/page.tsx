// app/category/[slug]/page.tsx

export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import AdListItem from "@/app/components/AdListItem";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const decodedSlug = decodeURIComponent(slug);

  const ads = await prisma.ad.findMany({
    where: {
      category: { equals: decodedSlug, mode: "insensitive" },
      status: "PUBLISHED",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    include: { media: true },
  });

  const title = decodedSlug.replace(/-/g, " ");

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-5xl bg-white p-6 border">
        <h1 className="mb-4 text-2xl font-bold capitalize">{title}</h1>

        {ads.length === 0 ? (
          <p className="text-sm text-gray-500">
            No ads found for this category
          </p>
        ) : (
          <ul className="space-y-3 text-sm">
            {ads.map((ad) => {
              const safeTitle =
                ad.title ?? ad.description?.slice(0, 50) ?? "Untitled Ad";

              const mediaArray = Array.isArray(ad.media) ? ad.media : [];

              return (
                <AdListItem
                  key={ad.id}
                  id={ad.id}
                  title={safeTitle}
                  hasImages={mediaArray.length > 0}
                />
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
