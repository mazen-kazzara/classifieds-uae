/**
 * Zod schemas for company registration.
 * Used on both server (request validation) and client (form validation).
 */
import { z } from "zod";

export const COMPANY_TRADE_LICENSE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const COMPANY_TRADE_LICENSE_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const uaePhone = z
  .string()
  .transform(s => s.replace(/[\s+\-()]/g, ""))
  .refine(p => /^9715[0-9]{8}$/.test(p), { message: "Must be a UAE number: 9715XXXXXXXX" });

/**
 * Strong password policy:
 * - Min 8 chars, max 72 (bcrypt's safe ceiling)
 * - At least one lowercase, one uppercase, one digit
 * - At least one symbol from a curated set (avoids ambiguous unicode)
 */
const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password is too long")
  .refine(p => /[a-z]/.test(p), "Must contain a lowercase letter")
  .refine(p => /[A-Z]/.test(p), "Must contain an uppercase letter")
  .refine(p => /[0-9]/.test(p), "Must contain a digit")
  .refine(p => /[!@#$%^&*()_\-+={}[\]:;"'<>,.?/|\\~`]/.test(p), "Must contain a symbol");

export const companyRegistrationSchema = z
  .object({
    planSlug: z.enum(["basic-business", "standard-business", "premium-business"]),
    tradeLicenseName: z.string().trim().min(3, "Trade license name is too short").max(200),
    companyPhone: uaePhone,
    authorizedSignatory: z.string().trim().min(3, "Name is too short").max(120),
    activity: z.string().trim().min(2).max(80),
    password: strongPassword,
    confirmPassword: z.string(),
    termsAccepted: z.preprocess(v => v === "true" || v === true, z.literal(true, { message: "You must accept the terms" })),
  })
  .refine(d => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type CompanyRegistrationInput = z.infer<typeof companyRegistrationSchema>;

export const companyOtpVerifySchema = z.object({
  companyId: z.string().min(1),
  code: z.string().regex(/^[0-9]{4,8}$/, "Invalid code"),
});
