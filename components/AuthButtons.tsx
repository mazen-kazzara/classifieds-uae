"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "@/lib/useTranslations";
import { usePathname } from "next/navigation";

export default function AuthButtons() {
  const { data: session, status } = useSession();
  const t = useTranslations("common");
  const pathname = usePathname();
  const locale = pathname.startsWith("/ar") ? "ar" : "en";

  if (status === "loading") return null;

  if (status === "authenticated") {
    return (
      <>
        <Link href={`/${locale}/my-ads`} className="btn-ghost" style={{ height: 36, padding: "0 0.75rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--primary)" }}>
          {t("myAds")}
        </Link>
        <button onClick={() => signOut({ callbackUrl: `/${locale}` })} className="btn-ghost" style={{ height: 36, padding: "0 0.75rem", fontSize: "0.8125rem" }}>
          {t("signOut")}
        </button>
      </>
    );
  }

  return (
    <Link href={`/${locale}/login`} className="btn-ghost" style={{ height: 36, padding: "0 0.75rem", fontSize: "0.8125rem", fontWeight: 600 }}>
      {t("signIn")}
    </Link>
  );
}
