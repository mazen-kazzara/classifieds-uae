import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";

export const dynamic = "force-dynamic";

function contentTypeFromExt(ext: string) {
  switch (ext.toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: parts } = await context.params;

  // Guard
  if (!parts || parts.length === 0) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Prevent path traversal
  if (parts.some((p) => p.includes("..") || p.includes("\\") || p.includes(":"))) {
    return new NextResponse("Bad request", { status: 400 });
  }

  // Map URL /uploads/... to disk /app/public/uploads/...
  const relative = parts.join("/");
  const baseDir = path.join(process.cwd(), "public", "uploads");
  const filePath = path.join(baseDir, relative);

  try {
    const buf = await readFile(filePath);
    const ext = path.extname(filePath);

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentTypeFromExt(ext),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
