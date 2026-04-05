"use client";
import { useEffect, useState } from "react";

export default function AuditPage() {
  const [logs, setLogs] = useState<Array<{id:string;action:string;entity:string;actor:string;ipAddress?:string;createdAt:string;payload?:Record<string,unknown>}>>([]);
  const [expanded, setExpanded] = useState<string|null>(null);

  useEffect(() => {
    fetch("/api/admin/audit").then(r=>r.json()).then(d => { if (d.ok) setLogs(d.logs); });
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Audit Log</h1>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-3 font-semibold text-gray-600">Action</th>
              <th className="text-left p-3 font-semibold text-gray-600">Entity</th>
              <th className="text-left p-3 font-semibold text-gray-600">Actor</th>
              <th className="text-left p-3 font-semibold text-gray-600">IP</th>
              <th className="text-left p-3 font-semibold text-gray-600">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.map((log) => (
              <>
                <tr key={log.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(expanded===log.id ? null : log.id)}>
                  <td className="p-3 font-medium text-gray-900">{log.action}</td>
                  <td className="p-3 text-gray-600">{log.entity}</td>
                  <td className="p-3 text-gray-600">{(log.payload as Record<string,unknown>)?.actorId as string || log.actor}</td>
                  <td className="p-3 text-gray-400 text-xs">{log.ipAddress?.replace("::ffff:","") || "-"}</td>
                  <td className="p-3 text-gray-400 text-xs">{new Date(log.createdAt).toLocaleString("en-AE")}</td>
                </tr>
                {expanded===log.id && (
                  <tr key={`${log.id}-expanded`}><td colSpan={5} className="p-3 bg-gray-50"><pre className="text-xs text-gray-600 overflow-auto">{JSON.stringify(log.payload, null, 2)}</pre></td></tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
