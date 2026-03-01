"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ClientRow = {
  id: string;
  name: string;
  email?: string | null;
  monthlyFee: number;
  createdAt: string;
  status: "PAID" | "UNPAID";
};

type ClientsResponse = {
  year: number;
  month: number;
  clients: ClientRow[];
};

function monthLabel(m: number) {
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return names[m - 1] ?? `M${m}`;
}

export default function ClientsPage() {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [name, setName] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [loading, setLoading] = useState(true);

  const years = useMemo(() => {
    const y = now.getFullYear();
    return [y - 1, y, y + 1];
  }, [now]);

  async function loadClients(y: number, m: number) {
    setLoading(true);
    const res = await fetch(`/api/clients?year=${y}&month=${m}`);
    const data = (await res.json()) as ClientsResponse;

    setYear(Number(data?.year ?? y));
    setMonth(Number(data?.month ?? m));
    setClients(Array.isArray(data?.clients) ? data.clients : []);
    setLoading(false);
  }

  async function createClient(e: React.FormEvent) {
    e.preventDefault();

    await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        monthlyFee: Number(monthlyFee),
      }),
    });

    setName("");
    setMonthlyFee("");
    loadClients(year, month);
  }

  async function recordPayment(clientId: string, amount: number, clientName: string) {
    const confirmed = window.confirm(`Record payment of ₱${amount.toLocaleString()} for ${clientName}?`);
    if (!confirmed) return;

    await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, amount, year, month }),
    });

    loadClients(year, month);
  }

  useEffect(() => {
    loadClients(year, month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <main style={{ padding: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 32, margin: 0 }}>Clients</h1>
          <div style={{ opacity: 0.7, marginTop: 6 }}>
            Viewing: {monthLabel(month)} {year}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select
            value={year}
            onChange={(e) => {
              const y = Number(e.target.value);
              setYear(y);
              loadClients(y, month);
            }}
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
            onChange={(e) => {
              const m = Number(e.target.value);
              setMonth(m);
              loadClients(year, m);
            }}
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

          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <span style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" }}>Back</span>
          </Link>
        </div>
      </div>

      <form onSubmit={createClient} style={{ marginTop: 20 }}>
        <input
          placeholder="Client name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ marginRight: 10 }}
        />
        <input
          placeholder="Monthly fee"
          type="number"
          value={monthlyFee}
          onChange={(e) => setMonthlyFee(e.target.value)}
          required
          style={{ marginRight: 10 }}
        />
        <button type="submit">Add</button>
      </form>

      <div style={{ marginTop: 30 }}>
        {clients.map((c) => (
          <div
            key={c.id}
            style={{
              padding: 12,
              borderBottom: "1px solid #ddd",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div>
              <strong>{c.name}</strong> — ₱{c.monthlyFee} — {c.status}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <Link
                href="/dashboard/payments"
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                  textDecoration: "none",
                }}
              >
                View Payments
              </Link>

              <button
                onClick={() => recordPayment(c.id, c.monthlyFee, c.name)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                  background: "#fff",
                }}
              >
                Record Payment
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
