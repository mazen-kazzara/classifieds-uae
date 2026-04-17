import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

const CATEGORY_ICONS: Record<string, string> = {
  Vehicles: "🚗", "سيارات": "🚗",
  "Real Estate": "🏠", "عقارات": "🏠",
  Electronics: "📱", "إلكترونيات": "📱",
  Jobs: "💼", "وظائف": "💼",
  Services: "🛠", "خدمات": "🛠",
  "Salons & Beauty": "💇", "صالونات وتجميل": "💇",
  Clinics: "🏥", "عيادات": "🏥",
  Furniture: "🪑", "أثاث": "🪑",
  "Education & Training": "📚", "تعليم وتدريب": "📚",
  "Clothes and Fashion": "👗", "ملابس وأزياء": "👗",
  Other: "📦", "أخرى": "📦",
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = searchParams.get("title") || "New Ad";
  const category = searchParams.get("category") || "Other";
  const price = searchParams.get("price") || "";
  const icon = CATEGORY_ICONS[category] || "📢";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#111111",
          padding: "60px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top: Logo area */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              fontSize: "28px",
              fontWeight: 800,
              color: "#ffffff",
              display: "flex",
            }}
          >
            Classifieds{" "}
            <span style={{ color: "#EF3B24", marginLeft: "4px" }}>U</span>
            <span style={{ color: "#00B857" }}>A</span>
            <span style={{ color: "#ffffff" }}>E</span>
          </div>
        </div>

        {/* Middle: Category icon + Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            flex: 1,
            justifyContent: "center",
          }}
        >
          <div style={{ fontSize: "72px", display: "flex" }}>{icon}</div>
          <div
            style={{
              fontSize: "48px",
              fontWeight: 800,
              color: "#ffffff",
              lineClamp: 3,
              display: "flex",
              lineHeight: 1.2,
            }}
          >
            {title.length > 80 ? title.slice(0, 80) + "..." : title}
          </div>
          <div
            style={{
              display: "flex",
              gap: "16px",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: "22px",
                color: "#999999",
                backgroundColor: "#1a1a1a",
                padding: "8px 20px",
                borderRadius: "12px",
                display: "flex",
              }}
            >
              {category}
            </div>
            {price && (
              <div
                style={{
                  fontSize: "22px",
                  color: "#00B857",
                  backgroundColor: "#1a1a1a",
                  padding: "8px 20px",
                  borderRadius: "12px",
                  display: "flex",
                }}
              >
                {price} AED
              </div>
            )}
          </div>
        </div>

        {/* Bottom: CTA */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: "20px", color: "#666666", display: "flex" }}>
            classifiedsuae.ae
          </div>
          <div
            style={{
              fontSize: "18px",
              color: "#ffffff",
              backgroundColor: "#0e7c47",
              padding: "12px 28px",
              borderRadius: "12px",
              fontWeight: 700,
              display: "flex",
            }}
          >
            View Ad →
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
    }
  );
}
