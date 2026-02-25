"use client"

import { useEffect, useState } from "react"

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY || ""

  async function loadUsers() {
    const res = await fetch("/api/admin/users", {
      headers: { "x-admin-key": adminKey },
    })
    const data = await res.json()
    if (data.ok) {
      setUsers(data.users)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  async function changeRole(userId: string, role: string) {
    await fetch("/api/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
      },
      body: JSON.stringify({ userId, role }),
    })

    loadUsers()
  }

  if (loading) return <div className="p-10">Loading...</div>

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Users</h1>

      <div className="space-y-4">
        {users.map((user) => (
          <div key={user.id} className="bg-white p-4 rounded shadow">
            <p><strong>Email:</strong> {user.email}</p>

            <select
              value={user.role}
              onChange={(e) => changeRole(user.id, e.target.value)}
              className="border p-2 mt-2"
            >
              <option value="ADMIN">ADMIN</option>
              <option value="SUPERVISOR">SUPERVISOR</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}
