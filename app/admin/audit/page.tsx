"use client";
import { useEffect, useState } from "react";
import { useAdminLocale } from "../useAdminLocale";

const thStyle: React.CSSProperties = { padding: "0.75rem", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textAlign: "start", borderBottom: "1.5px solid var(--border)" };
const tdStyle: React.CSSProperties = { padding: "0.75rem", fontSize: "0.8125rem", color: "var(--text)", borderBottom: "1px solid var(--border)" };

export default function AuditPage() {
  const { isAr, t } = useAdminLocale();
  const [logs, setLogs] = useState<Array<{ id: string; action: string; entity: string; actor: string; ipAddress?: string; createdAt: string; payload?: Record<string, unknown> }>>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { fetch("/api/admin/audit").then(r => r.json()).then(d => { if (d.ok) setLogs(d.logs); }); }, []);

  return (
    <div>
      <h1 style={{ color: "var(--text)", fontWeight: 800, fontSize: "1.5rem", marginBottom: "1.25rem" }}>{t("Audit Log", "سجل العمليات")}</h1>
      <div style={{ backgroundColor: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "var(--surface-2)" }}>
                <th style={thStyle}>{t("Action", "الإجراء")}</th>
                <th style={thStyle}>{t("Entity", "الكيان")}</th>
                <th style={thStyle}>{t("Actor", "المنفّذ")}</th>
                <th style={thStyle}>{t("IP", "العنوان")}</th>
                <th style={thStyle}>{t("Time", "الوقت")}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} onClick={() => setExpanded(expanded === log.id ? null : log.id)} style={{ cursor: "pointer", transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--surface-2)")} onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{log.action}</td>
                  <td style={tdStyle}>{log.entity}</td>
                  <td style={tdStyle}>{(log.payload as Record<string, unknown>)?.actorId as string || log.actor}</td>
                  <td style={{ ...tdStyle, fontSize: "0.7rem", color: "var(--text-muted)" }}>{log.ipAddress?.replace("::ffff:", "") || "-"}</td>
                  <td style={{ ...tdStyle, fontSize: "0.7rem", color: "var(--text-muted)" }}>{new Date(log.createdAt).toLocaleString(isAr ? "ar-AE" : "en-AE")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
