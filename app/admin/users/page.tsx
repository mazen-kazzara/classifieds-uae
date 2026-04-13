"use client";
import { useEffect, useState } from "react";
import { useAdminLocale } from "../useAdminLocale";

interface User {
  id: string; phone?: string; email?: string; name?: string; role: string;
  phoneVerified: boolean; emailVerified: boolean; provider?: string;
  createdAt: string; adsCount: number;
}

const cardStyle: React.CSSProperties = { backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" };
const thStyle: React.CSSProperties = { padding: "0.75rem", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textAlign: "start", borderBottom: "1.5px solid var(--border)" };
const tdStyle: React.CSSProperties = { padding: "0.75rem", fontSize: "0.8125rem", color: "var(--text)", borderBottom: "1px solid var(--border)" };
const btnSmall: React.CSSProperties = { padding: "0.25rem 0.625rem", borderRadius: "var(--radius-md)", fontSize: "0.7rem", fontWeight: 600, border: "1.5px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-muted)", cursor: "pointer" };

export default function UsersPage() {
  const { isAr, t } = useAdminLocale();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch("/api/admin/users");
    const d = await res.json();
    if (d.ok) setUsers(d.users);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function doAction(userId: string, action: string, role?: string) {
    if (action === "delete" && !confirm(t("Delete this user and all their submissions?", "حذف هذا المستخدم وجميع طلباته؟"))) return;
    await fetch("/api/admin/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, role }),
    });
    setMsg(action === "delete" ? t("User deleted","تم حذف المستخدم") : action === "suspend" ? t("User suspended","تم إيقاف المستخدم") : action === "activate" ? t("User activated","تم تفعيل المستخدم") : t("Role updated","تم تحديث الصلاحية"));
    load();
  }

  const isActive = (u: User) => u.phoneVerified || u.emailVerified;

  return (
    <div>
      <h1 style={{ color: "var(--text)", fontWeight: 800, fontSize: "1.5rem", marginBottom: "1.25rem" }}>{t("Users", "المستخدمون")} ({users.length})</h1>

      {msg && <div style={{ backgroundColor: "color-mix(in srgb, var(--primary) 10%, var(--surface))", border: "1.5px solid var(--primary)", borderRadius: "var(--radius-md)", padding: "0.625rem 1rem", marginBottom: "1rem", color: "var(--primary)", fontSize: "0.8125rem", cursor: "pointer" }} onClick={() => setMsg("")}>{msg}</div>}

      {loading ? <p style={{ color: "var(--text-muted)" }}>Loading...</p> : (
        <div style={cardStyle}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--surface-2)" }}>
                  <th style={thStyle}>{t("User","المستخدم")}</th>
                  <th style={thStyle}>{t("Provider","طريقة التسجيل")}</th>
                  <th style={thStyle}>{t("Role","الصلاحية")}</th>
                  <th style={thStyle}>{t("Status","الحالة")}</th>
                  <th style={thStyle}>{t("Ads","الإعلانات")}</th>
                  <th style={thStyle}>{t("Joined","التسجيل")}</th>
                  <th style={thStyle}>{t("Actions","إجراءات")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--surface-2)")} onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                    <td style={tdStyle}>
                      <p style={{ fontWeight: 600 }}>{user.name || user.email || user.phone || "—"}</p>
                      {user.email && <p style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{user.email}</p>}
                      {user.phone && <p style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>+{user.phone}</p>}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{user.provider || (user.phone ? "Phone" : "Email")}</span>
                    </td>
                    <td style={tdStyle}>
                      <select value={user.role} onChange={e => doAction(user.id, "", e.target.value)}
                        style={{ padding: "0.25rem 0.5rem", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text)", fontSize: "0.75rem", cursor: "pointer", outline: "none" }}>
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="SUPERVISOR">SUPERVISOR</option>
                      </select>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 999, backgroundColor: isActive(user) ? "color-mix(in srgb, var(--primary) 15%, var(--surface))" : "color-mix(in srgb, var(--danger) 15%, var(--surface))", color: isActive(user) ? "var(--primary)" : "var(--danger)" }}>
                        {isActive(user) ? t("Active","نشط") : t("Suspended","موقوف")}
                      </span>
                    </td>
                    <td style={tdStyle}>{user.adsCount}</td>
                    <td style={{ ...tdStyle, fontSize: "0.75rem", color: "var(--text-muted)" }}>{new Date(user.createdAt).toLocaleDateString("en-AE")}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "0.375rem" }}>
                        {isActive(user) ? (
                          <button onClick={() => doAction(user.id, "suspend")} style={{ ...btnSmall, color: "#EAB308", borderColor: "#EAB308" }}>{t("Suspend","إيقاف")}</button>
                        ) : (
                          <button onClick={() => doAction(user.id, "activate")} style={{ ...btnSmall, color: "var(--primary)", borderColor: "var(--primary)" }}>{t("Activate","تفعيل")}</button>
                        )}
                        <button onClick={() => doAction(user.id, "delete")} style={{ ...btnSmall, color: "var(--danger)", borderColor: "var(--danger)" }}>{t("Delete","حذف")}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
