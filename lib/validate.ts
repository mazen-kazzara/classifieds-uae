import { NextResponse } from "next/server";
import { ZodSchema } from "zod";

export async function validateRequest<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  try {
    const body = await req.json();

    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            ok: false,
            error: "INVALID_REQUEST",
            details: parsed.error.issues,
          },
          { status: 400 }
        ),
      };
    }

    return { ok: true, data: parsed.data };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "INVALID_JSON" },
        { status: 400 }
      ),
    };
  }
}
