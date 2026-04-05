import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function GET() {
  try {
    const packages = await prisma.package.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
    return NextResponse.json({ ok: true, packages });
  } catch { return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 }); }
}
