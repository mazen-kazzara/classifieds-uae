"use client";
import { useEffect, useState } from "react";

interface User { id: string; phone: string; email?: string; role: string; createdAt: string; }

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/admin/users");
    const d = await res.json();
    if (d.ok) setUsers(d.users);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function changeRole(userId: string, role: string) {
    await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, role }) });
    load();
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Users ({users.length})</h1>
      {loading ? <p className="text-gray-500">Loading...</p> : (
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{user.phone}</p>
                {user.email && <p className="text-xs text-gray-500">{user.email}</p>}
                <p className="text-xs text-gray-400">{new Date(user.createdAt).toLocaleDateString("en-AE")}</p>
              </div>
              <select value={user.role} onChange={(e) => changeRole(user.id, e.target.value)} className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm bg-white outline-none focus:border-blue-400">
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
                <option value="SUPERVISOR">SUPERVISOR</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
