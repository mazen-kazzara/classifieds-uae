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

  useEffect(() => {
    if (status === "unauthenticated" && pathname !== "/admin/login") {
      router.replace("/admin/login")
    }
  }, [status, pathname, router])

  // wait until session resolved
  if (status === "loading") {
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
