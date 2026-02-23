"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Client = {
  id: string;
  name: string;
  email?: string | null;
  monthlyFee: number;
  createdAt: string;
  payments?: {
    id: string;
    amount: number;
    paidAt: string;
  }[];
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [name, setName] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadClients() {
    const res = await fetch("/api/clients");
    const data = await res.json();
    setClients(Array.isArray(data) ? data : []);
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
    loadClients();
  }

  async function recordPayment(clientId: string, amount: number, clientName: string) {
    const confirmed = window.confirm(
      `Record payment of ₱${amount.toLocaleString()} for ${clientName}?`
    );

    if (!confirmed) return;

    await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        amount,
      }),
    });

    loadClients();
  }

  useEffect(() => {
    loadClients();
  }, []);

  const withDerivedStatus = useMemo(() => {
    return clients.map((c) => {
      const lastPayment = c.payments?.[0];
      const status = lastPayment ? "PAID" : "UNPAID";
      return { ...c, derivedStatus: status };
    });
  }, [clients]);

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <main style={{ padding: 40 }}>
      <h1 style={{ fontSize: 32 }}>Clients</h1>

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
        {withDerivedStatus.map((c: any) => (
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
              <strong>{c.name}</strong> — ₱{c.monthlyFee} — {c.derivedStatus}
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
