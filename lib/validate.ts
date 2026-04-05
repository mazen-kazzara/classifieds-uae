import { NextResponse } from "next/server";
import { ZodSchema } from "zod";

export async function validateRequest<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  let body: unknown;
  try { body = await req.json(); }
  catch {
    return { ok: false, response: NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 }) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, response: NextResponse.json({ ok: false, error: "VALIDATION_ERROR", details: parsed.error.issues }, { status: 400 }) };
  }
  return { ok: true, data: parsed.data };
}
