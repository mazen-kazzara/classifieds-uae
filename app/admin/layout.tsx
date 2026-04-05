"use client";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import AdminProviders from "./providers";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/admin/submissions", label: "Submissions", icon: "📋" },
  { href: "/admin/ads", label: "Ads", icon: "📢" },
  { href: "/admin/users", label: "Users", icon: "👤" },
  { href: "/admin/categories", label: "Categories", icon: "📁" },
  { href: "/admin/packages", label: "Packages", icon: "📦" },
  { href: "/admin/pricing", label: "Pricing", icon: "💰" },
  { href: "/admin/audit", label: "Audit Log", icon: "🔍" },
];

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const { status, data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated" && pathname !== "/admin/login") router.replace("/admin/login");
  }, [status, pathname, router]);

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-56 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col">
        <div className="p-4 border-b">
          <Link href="/" className="text-blue-600 font-extrabold text-lg">ClassifiedsUAE</Link>
          <p className="text-xs text-gray-400 mt-0.5">Admin Panel</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${pathname.startsWith(item.href) ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-600 hover:bg-gray-50"}`}>
              <span>{item.icon}</span>{item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t">
          <p className="text-xs text-gray-500 mb-2">{(session?.user as { email?: string })?.email}</p>
          <Link href="/api/auth/signout" className="block text-xs text-red-500 hover:text-red-700">Sign out</Link>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminProviders><AdminLayoutInner>{children}</AdminLayoutInner></AdminProviders>;
}
