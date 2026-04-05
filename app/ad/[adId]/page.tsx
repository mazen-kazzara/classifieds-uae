export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

const CATEGORY_IMAGES: Record<string, string> = {
  vehicles: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80",
  "real-estate": "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80",
  electronics: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80",
  jobs: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80",
  services: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80",
  salons: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80",
  clinics: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80",
  furniture: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80",
  education: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80",
  other: "https://images.unsplash.com/photo-1586769852044-692d6e3703f0?w=800&q=80",
};

function getCategoryImage(category: string): string {
  const slug = category.toLowerCase().replace(/ /g, "-").replace(/&/g, "").replace(/--/g, "-");
  return CATEGORY_IMAGES[slug] || CATEGORY_IMAGES["other"];
}

interface Props { params: Promise<{ adId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { adId } = await params;
  const ad = await prisma.ad.findUnique({ where: { id: decodeURIComponent(adId) }, select: { title: true, description: true, category: true } });
  if (!ad) return { title: "Ad Not Found" };
  return { title: ad.title + " | Classifieds UAE", description: ad.description.slice(0, 160) };
}

export default async function AdPage({ params }: Props) {
  const { adId } = await params;
  const ad = await prisma.ad.findUnique({
    where: { id: decodeURIComponent(adId) },
    include: { media: { orderBy: { position: "asc" } } },
  });
  if (!ad) notFound();

  const now = new Date();
  const expired = ad.expiresAt < now;
  const isOffer = ad.contentType === "offer";
  const isService = ad.contentType === "service";
  const offerExpired = isOffer && ad.offerEndDate && ad.offerEndDate < now;

  prisma.ad.update({ where: { id: ad.id }, data: { viewsCount: { increment: 1 } } }).catch(() => {});

  const waNumber = ad.whatsappNumber?.replace(/\D/g, "") || "";
  const waText = encodeURIComponent("Hi, I saw your ad on ClassifiedsUAE: " + (ad.title || ad.description.slice(0, 50)));
  const whatsappUrl = waNumber ? "https://wa.me/" + waNumber + "?text=" + waText : null;

  const adPrice = (ad as any).adPrice as number | null;
  const isNegotiable = (ad as any).isNegotiable as boolean;
  const showPrice = adPrice != null || isNegotiable;
  const priceLabel = isNegotiable && adPrice
    ? adPrice.toLocaleString("en-AE") + " AED · Negotiable"
    : isNegotiable ? "Negotiable" : adPrice ? adPrice.toLocaleString("en-AE") + " AED" : "";

  const contactMethod = ad.contactMethod || (whatsappUrl ? "whatsapp" : "call");
  const showWhatsApp = (contactMethod === "whatsapp" || contactMethod === "both") && !!whatsappUrl;
  const showCall = (contactMethod === "call" || contactMethod === "both") && !!ad.contactPhone;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }}>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        {expired && <div style={{ backgroundColor: "color-mix(in srgb, var(--danger) 10%, var(--surface))", border: "1.5px solid var(--danger)", borderRadius: "var(--radius-md)", padding: "0.875rem 1rem", marginBottom: "1rem", color: "var(--danger)", fontSize: "0.875rem", fontWeight: 500 }}>This ad has expired.</div>}
        {offerExpired && <div style={{ backgroundColor: "#FFF7ED", border: "1.5px solid #FDBA74", borderRadius: "var(--radius-md)", padding: "0.875rem 1rem", marginBottom: "1rem", color: "#9A3412", fontSize: "0.875rem", fontWeight: 500 }}>This offer has ended.</div>}

        <div style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)" }} className="shadow-card overflow-hidden">
          <div style={{ padding: "1.75rem 2rem" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "1rem" }}>
              {isOffer && <span style={{ backgroundColor: "#FFEDD5", color: "#9A3412", fontSize: "0.75rem", fontWeight: 700, padding: "0.25rem 0.75rem", borderRadius: 999 }}>Offer</span>}
              {isService && <span style={{ backgroundColor: "color-mix(in srgb, var(--primary) 12%, var(--surface))", color: "var(--primary)", fontSize: "0.75rem", fontWeight: 700, padding: "0.25rem 0.75rem", borderRadius: 999 }}>Service</span>}
              {ad.isFeatured && <span style={{ backgroundColor: "#FEF9C3", color: "#854D0E", fontSize: "0.75rem", fontWeight: 700, padding: "0.25rem 0.75rem", borderRadius: 999 }}>Featured</span>}
              {ad.isPinned && <span style={{ backgroundColor: "#DBEAFE", color: "#1E40AF", fontSize: "0.75rem", fontWeight: 700, padding: "0.25rem 0.75rem", borderRadius: 999 }}>Pinned</span>}
            </div>

            <h1 style={{ color: "var(--text)", fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.375rem", lineHeight: 1.25 }}>{ad.title || "Untitled Ad"}</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: showPrice ? "0.875rem" : "1.5rem", textTransform: "capitalize" }}>Category: {ad.category}</p>

            {showPrice && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", backgroundColor: "color-mix(in srgb, var(--primary) 10%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--primary) 25%, transparent)", borderRadius: "var(--radius-md)", padding: "0.5rem 1.25rem", marginBottom: "1.5rem" }}>
                <span style={{ color: "var(--primary)", fontWeight: 800, fontSize: "1.375rem" }}>{priceLabel}</span>
              </div>
            )}

            {isOffer && (ad.offerStartDate || ad.offerEndDate) && (
              <div style={{ backgroundColor: "#FFF7ED", border: "1.5px solid #FDBA74", borderRadius: "var(--radius-md)", padding: "0.875rem 1rem", marginBottom: "1.5rem" }}>
                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#9A3412", marginBottom: "0.25rem" }}>Offer Period</p>
                <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.875rem", color: "#C2410C" }}>
                  {ad.offerStartDate && <span>From: {new Date(ad.offerStartDate).toLocaleDateString("en-AE")}</span>}
                  {ad.offerEndDate && <span>Until: {new Date(ad.offerEndDate).toLocaleDateString("en-AE")}</span>}
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.75rem", marginBottom: "1.75rem" }}>
              {ad.media.length > 0 ? ad.media.map((m) => {
                const url = m.url.startsWith("/") ? m.url : "/uploads/" + m.url;
                return (
                  <a key={m.id} href={url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="Ad image" style={{ width: "100%", height: 260, objectFit: "cover", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border)" }} />
                  </a>
                );
              }) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={getCategoryImage(ad.category)} alt={ad.category} style={{ width: "100%", height: 260, objectFit: "cover", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border)", opacity: 0.75 }} />
              )}
            </div>

            <div style={{ marginBottom: "2rem" }}>
              <h2 style={{ color: "var(--text)", fontWeight: 700, fontSize: "1.0625rem", marginBottom: "0.625rem" }}>Description</h2>
              <p style={{ color: "var(--text-muted)", whiteSpace: "pre-line", lineHeight: 1.7, fontSize: "0.9375rem" }}>{ad.description}</p>
            </div>

            {!expired && (
              <div style={{ borderTop: "1.5px solid var(--border)", paddingTop: "1.5rem" }}>
                <h2 style={{ color: "var(--text)", fontWeight: 700, fontSize: "1.0625rem", marginBottom: "1rem" }}>{isService ? "Book / Contact" : "Contact Seller"}</h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                  {showWhatsApp && (
                    <a href={whatsappUrl!} target="_blank" rel="noopener noreferrer" data-track="whatsapp" data-ad-id={ad.id}
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0 1.25rem", height: 46, backgroundColor: "#25D366", color: "#fff", borderRadius: "var(--radius-md)", fontWeight: 600, fontSize: "0.9375rem", textDecoration: "none" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      WhatsApp
                    </a>
                  )}
                  {showCall && (
                    <a href={"tel:" + ad.contactPhone} data-track="call" data-ad-id={ad.id}
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0 1.25rem", height: 46, backgroundColor: "var(--primary)", color: "#fff", borderRadius: "var(--radius-md)", fontWeight: 600, fontSize: "0.9375rem", textDecoration: "none" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>
                      Call
                    </a>
                  )}
                  {isService && ad.bookingEnabled && whatsappUrl && (
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" data-track="booking" data-ad-id={ad.id}
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0 1.25rem", height: 46, backgroundColor: "#7C3AED", color: "#fff", borderRadius: "var(--radius-md)", fontWeight: 600, fontSize: "0.9375rem", textDecoration: "none" }}>
                      Book Now
                    </a>
                  )}
                </div>
              </div>
            )}

            <div style={{ borderTop: "1.5px solid var(--border)", marginTop: "2rem", paddingTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", textAlign: "center" }}>
              <div><p style={{ fontSize: "1.375rem", fontWeight: 800, color: "var(--text)" }}>{ad.viewsCount}</p><p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Views</p></div>
              <div><p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Ad ID</p><p style={{ fontSize: "0.7rem", fontFamily: "monospace", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ad.id}</p></div>
              <div><p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Posted</p><p style={{ fontSize: "0.8125rem", color: "var(--text)" }}>{ad.publishedAt ? new Date(ad.publishedAt).toLocaleDateString("en-AE") : "—"}</p></div>
              <div><p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Expires</p><p style={{ fontSize: "0.8125rem", color: expired ? "var(--danger)" : "var(--text)" }}>{new Date(ad.expiresAt).toLocaleDateString("en-AE")}</p></div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <Link href="/" style={{ color: "var(--primary)", textDecoration: "none", fontSize: "0.9375rem", fontWeight: 500 }}>Back to listings</Link>
        </div>
      </main>
      <Footer />
      <script dangerouslySetInnerHTML={{ __html: "document.querySelectorAll('[data-track]').forEach(el=>{el.addEventListener('click',()=>{const id=el.getAttribute('data-ad-id');const t=el.getAttribute('data-track');if(!id||!t)return;fetch('/api/ads/'+id+'/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:t})}).catch(()=>{});});});" }} />
    </div>
  );
}
