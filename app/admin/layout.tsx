"use client"

import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  // allow login page without auth
  if (pathname === "/admin/login") {
    return <>{children}</>
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/admin/login")
    }
  }, [status, router])

  // 🚨 IMPORTANT: block rendering until session resolved
  if (status !== "authenticated") {
    return (
      <div className="p-10 text-center">
        loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {children}
    </div>
  )
}