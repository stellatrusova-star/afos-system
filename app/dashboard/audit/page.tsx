"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AuditLog = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  meta: any;
  createdAt: string;
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  async function load() {
    const res = await fetch("/api/audit");
    const data = await res.json();
    setLogs(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Audit Log</h1>
        <Link href="/dashboard" style={{ textDecoration: "none" }}>
          <span style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" }}>Back</span>
        </Link>
      </div>

      <div style={{ marginTop: 20, display: "grid", gap: 10 }}>
        {logs.map((l) => (
          <div
            key={l.id}
            style={{
              padding: 12,
              border: "1px solid #eee",
              borderRadius: 12,
              fontSize: 14,
            }}
          >
            <div><strong>{l.action}</strong> — {l.entityType}</div>
            <div style={{ opacity: 0.7 }}>
              {new Date(l.createdAt).toISOString()}
            </div>
            <pre style={{ marginTop: 8, fontSize: 12 }}>
              {JSON.stringify(l.meta, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
