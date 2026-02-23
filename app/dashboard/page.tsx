"use client";

import Link from "next/link";

export default function DashboardPage() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <main style={{ fontFamily: "Arial", padding: 40 }}>
      <h1 style={{ fontSize: 42 }}>Dashboard</h1>

      <div style={{ marginTop: 30, display: "flex", gap: 12 }}>
        <Link href="/dashboard/clients">
          <button style={{ padding: 12, borderRadius: 10, border: "1px solid #333" }}>
            Clients
          </button>
        </Link>

        <Link href="/dashboard/payments">
          <button style={{ padding: 12, borderRadius: 10, border: "1px solid #333" }}>
            Payments
          </button>
        </Link>

        <Link href="/dashboard/audit">
          <button style={{ padding: 12, borderRadius: 10, border: "1px solid #333" }}>
            Audit Log
          </button>
        </Link>

        <button
          onClick={logout}
          style={{ padding: 12, borderRadius: 10, border: "1px solid #333" }}
        >
          Logout
        </button>
      </div>
    </main>
  );
}
