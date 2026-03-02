"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

function monthLabel(m: number) {
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return names[m - 1] ?? `M${m}`;
}

export default function DashboardPage() {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);

  const years = useMemo(() => {
  const y = new Date().getFullYear();
  return [y - 1, y, y + 1];
}, []);

  async function sendRemindersSelectedMonth() {
    const confirmed = window.confirm(`Send reminders for ${monthLabel(month)} ${year}?`);
    if (!confirmed) return;

    const res = await fetch("/api/reminders/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month }),
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

      <div style={{ marginTop: 18, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 800, opacity: 0.8 }}>Reminder period</div>

        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", background: "#fff" }}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", background: "#fff" }}
        >
          {Array.from({ length: 12 }).map((_, i) => {
            const m = i + 1;
            return (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            );
          })}
        </select>

        <button
          onClick={sendRemindersSelectedMonth}
          style={{ padding: 12, borderRadius: 10, border: "1px solid #333", background: "#fff" }}
        >
          Send Reminders
        </button>

        <div style={{ opacity: 0.7 }}>
          Target: {monthLabel(month)} {year}
        </div>
      </div>

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

        
        <Link href="/dashboard/billing">
          <button style={{ padding: 12, borderRadius: 10, border: "1px solid #333" }}>
            Billing
          </button>
        </Link>

<Link href="/dashboard/audit">
          <button style={{ padding: 12, borderRadius: 10, border: "1px solid #333" }}>
            Audit Log
          </button>
        </Link>

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
