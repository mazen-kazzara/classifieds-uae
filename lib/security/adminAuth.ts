import type { NextRequest } from "next/server";

export function verifyAdmin(req: NextRequest): boolean {
  const headerKey = req.headers.get("x-admin-key");
  const expectedKey = process.env.ADMIN_API_KEY;

  if (!headerKey || !expectedKey) {
    return false;
  }

  return headerKey === expectedKey;
}
