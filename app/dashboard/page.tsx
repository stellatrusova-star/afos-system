"use client";

import Link from "next/link";

export default function DashboardPage() {
  async function sendRemindersCurrentMonth() {
    const now = new Date();

    const res = await fetch("/api/reminders/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data?.error || "Failed to send reminders");
      return;
    }

    alert(`Reminders sent: ${data?.sent ?? 0}`);
  }

  return (
    <main style={{ fontFamily: "Arial", padding: 40 }}>
      <h1 style={{ fontSize: 42 }}>Dashboard</h1>

      <p style={{ fontSize: 18, marginTop: 10 }}>
        Accountant-safe infrastructure. Explicit actions only.
      </p>

      <div style={{ marginTop: 30, display: "flex", gap: 12, flexWrap: "wrap" }}>
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
          onClick={sendRemindersCurrentMonth}
          style={{ padding: 12, borderRadius: 10, border: "1px solid #333" }}
        >
          Send Reminders (Current Month)
        </button>

        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login";
          }}
          style={{ padding: 12, borderRadius: 10, border: "1px solid #333" }}
        >
          Logout
        </button>
      </div>

      <div style={{ marginTop: 40 }}>
        <Link href="/">
          <button style={{ padding: 12, borderRadius: 10, border: "1px solid #333" }}>
            Back to Home
          </button>
        </Link>
      </div>
    </main>
  );
}
