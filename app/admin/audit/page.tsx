"use client";

import { useEffect, useState } from "react";

function cleanIP(ip: string | null) {
  if (!ip) return "-";
  return ip.replace("::ffff:", "");
}

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/audit")
      .then(res => res.json())
      .then(data => {
        if (data.ok) setLogs(data.logs);
      });
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Audit Logs</h1>

      <table border={1} cellPadding={8} style={{ width: "100%", marginTop: 20 }}>
        <thead>
          <tr>
            <th>Action</th>
            <th>Entity</th>
            <th>Phone / Actor</th>
            <th>IP</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <>
              <tr
                key={log.id}
                style={{ cursor: "pointer" }}
                onClick={() =>
                  setExpanded(expanded === log.id ? null : log.id)
                }
              >
                <td>{log.action}</td>
                <td>{log.entity}</td>
                <td>
                  {log.payload?.actorId ||
                    log.user?.phone ||
                    log.actor ||
                    "-"}
                </td>
                <td>{cleanIP(log.ipAddress)}</td>
                <td>{new Date(log.createdAt).toLocaleString()}</td>
              </tr>

              {expanded === log.id && (
                <tr>
                  <td colSpan={5}>
                    <div style={{ display: "flex", gap: 40 }}>
                      <div>
                        <strong>Old Value</strong>
                        <pre>
                          {JSON.stringify(log.payload?.oldValue, null, 2)}
                        </pre>
                      </div>

                      <div>
                        <strong>New Value</strong>
                        <pre>
                          {JSON.stringify(log.payload?.newValue, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
