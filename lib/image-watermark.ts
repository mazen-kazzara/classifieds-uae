/**
 * Apply a "Classifieds UAE" watermark to user-uploaded ad images.
 *
 * Strategy: composite a tiled SVG (semi-transparent text + a corner badge)
 * onto the source image with sharp. Output preserves the original format
 * (JPEG/PNG/WEBP) and a sensible quality.
 *
 * Fail-soft: any error returns the original buffer untouched so the upload
 * flow is never blocked by a watermarking failure.
 *
 * Used by:
 *   - app/api/submissions/[id]/images/route.ts   (website)
 *   - app/api/telegram-ad/route.ts               (Telegram bot)
 *   - services/whatsapp/bot.ts                   (WhatsApp bot)
 *
 * PDFs (trade-license uploads) are not images and bypass this helper.
 */
import sharp from "sharp";

const WATERMARK_TEXT = "Classifieds UAE";

export interface WatermarkOptions {
  /** Pass through MIME from the upload — we re-encode to the same format. */
  mimeType?: string | null;
}

/** Skip non-image MIME types entirely. */
function isImageMime(mime?: string | null): boolean {
  if (!mime) return false;
  const m = mime.toLowerCase();
  return m === "image/jpeg" || m === "image/jpg" || m === "image/png" || m === "image/webp";
}

/**
 * Build the watermark SVG sized to the source image. Two layers:
 *   - large centered diagonal text (subtle, visible to the naked eye but
 *     transparent enough that the image stays fully readable)
 *   - small corner badge bottom-right (thumbnail-safe attribution)
 *
 * Font is named explicitly. The Dockerfile installs `ttf-dejavu` so that
 * librsvg/Pango can find real glyphs — without this the SVG renderer falls
 * back to a no-glyph font and shows boxes (tofu).
 */
const FONT_STACK = "DejaVu Sans, DejaVu Sans Bold, sans-serif";

function buildSvgOverlay(width: number, height: number): Buffer {
  // Centered diagonal watermark — sized so "Classifieds UAE" spans roughly
  // 60% of the smaller dimension. Bigger than before, but low opacity keeps
  // the image readable underneath.
  const minDim = Math.min(width, height);
  const fontSize = Math.max(36, Math.min(120, Math.round(minDim * 0.13)));

  // Bottom-right badge for thumbnail-safe branding.
  const badgeFont = Math.max(14, Math.min(28, Math.round(minDim * 0.035)));
  const badgePadX = Math.round(badgeFont * 0.7);
  const badgePadY = Math.round(badgeFont * 0.45);
  const badgeTextW = Math.round(WATERMARK_TEXT.length * badgeFont * 0.55);
  const badgeW = badgeTextW + badgePadX * 2;
  const badgeH = badgeFont + badgePadY * 2;
  const badgeX = width - badgeW - 12;
  const badgeY = height - badgeH - 12;

  const cx = width / 2;
  const cy = height / 2;

  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <g transform="rotate(-25 ${cx} ${cy})">
    <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle"
          font-family="${FONT_STACK}"
          font-size="${fontSize}" font-weight="bold"
          fill="#ffffff" fill-opacity="0.40"
          stroke="#000000" stroke-opacity="0.30" stroke-width="${Math.max(1, Math.round(fontSize / 32))}"
          paint-order="stroke fill"
          letter-spacing="2">${WATERMARK_TEXT}</text>
  </g>
  <g>
    <rect x="${badgeX}" y="${badgeY}" width="${badgeW}" height="${badgeH}"
          rx="6" ry="6" fill="#000000" fill-opacity="0.55"/>
    <text x="${badgeX + badgeW / 2}" y="${badgeY + badgeH / 2}"
          text-anchor="middle" dominant-baseline="middle"
          font-family="${FONT_STACK}"
          font-size="${badgeFont}" font-weight="bold"
          fill="#ffffff">${WATERMARK_TEXT}</text>
  </g>
</svg>`);
}

/** Re-encode the watermarked pipeline back to the source format. */
function encodeToFormat(pipeline: sharp.Sharp, mime?: string | null): sharp.Sharp {
  const m = (mime || "").toLowerCase();
  if (m === "image/png")  return pipeline.png({ compressionLevel: 8 });
  if (m === "image/webp") return pipeline.webp({ quality: 85 });
  // Default to JPEG (covers image/jpeg + unknown image MIMEs).
  return pipeline.jpeg({ quality: 85, mozjpeg: true });
}

/**
 * Apply the watermark to the buffer. Returns a new buffer or the original
 * if the input isn't an image or watermarking fails.
 */
export async function applyWatermark(input: Buffer, opts: WatermarkOptions = {}): Promise<Buffer> {
  if (!input || input.length === 0) return input;
  if (!isImageMime(opts.mimeType)) return input;

  try {
    const base = sharp(input, { failOn: "none" }).rotate(); // honour EXIF orientation
    const meta = await base.metadata();
    const width = meta.width || 0;
    const height = meta.height || 0;
    if (width < 64 || height < 64) {
      // Too small to bother — likely an icon/avatar, return original.
      return input;
    }

    const overlay = buildSvgOverlay(width, height);
    const pipeline = base.composite([{ input: overlay, top: 0, left: 0 }]);
    const encoded = encodeToFormat(pipeline, opts.mimeType);
    return await encoded.toBuffer();
  } catch (err: any) {
    console.error("[watermark] failed, keeping original:", err?.message || err);
    return input;
  }
}
