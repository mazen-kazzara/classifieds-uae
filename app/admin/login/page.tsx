"use client"

import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (res?.error) {
      setError("invalid email or password")
      setLoading(false)
      return
    }

    router.push("/admin/dashboard")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded bg-white p-6 shadow"
      >
        <h1 className="mb-4 text-xl font-bold text-center">admin login</h1>

        {error && (
          <div className="mb-3 rounded bg-red-100 p-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <input
          type="email"
          placeholder="email"
          className="mb-3 w-full rounded border p-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="password"
          className="mb-4 w-full rounded border p-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-black py-2 text-white disabled:opacity-50"
        >
          {loading ? "logging in..." : "login"}
        </button>
      </form>
    </div>
  )
}
