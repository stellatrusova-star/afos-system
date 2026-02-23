"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Payment = {
  id: string;
  clientId: string;
  amount: number;
  paidAt: string;
  client: {
    name: string;
  };
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);

  async function refresh() {
    const res = await fetch("/api/payments");
    if (!res.ok) return;
    const data = await res.json();
    setPayments(Array.isArray(data) ? data : []);
  }

  async function deletePayment(paymentId: string, clientName: string, amount: number) {
    const confirmed = window.confirm(
      `Delete payment of ₱${amount.toLocaleString()} for ${clientName}?`
    );

    if (!confirmed) return;

    await fetch("/api/payments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId }),
    });

    refresh();
  }

  useEffect(() => {
    refresh();
  }, []);

  const total = useMemo(
    () => payments.reduce((s, p) => s + (Number(p.amount) || 0), 0),
    [payments]
  );

  const sorted = useMemo(() => {
    return [...payments].sort((a, b) =>
      (b.paidAt || "").localeCompare(a.paidAt || "")
    );
  }, [payments]);

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Payments</h1>
        <Link href="/dashboard" style={{ textDecoration: "none" }}>
          <span style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" }}>Back</span>
        </Link>
      </div>

      <div style={{ marginTop: 18, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
        <div style={{ fontSize: 14, opacity: 0.7 }}>Total collected</div>
        <div style={{ fontSize: 28, fontWeight: 800 }}>₱ {total.toLocaleString()}</div>
      </div>

      <div style={{ marginTop: 18, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>History</h2>

        {sorted.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No payments yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {sorted.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: 12,
                  border: "1px solid #eee",
                  borderRadius: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 800 }}>{p.client.name}</div>
                  <div style={{ opacity: 0.7, fontSize: 13 }}>
                    {new Date(p.paidAt).toISOString().slice(0, 10)}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontWeight: 800 }}>
                    ₱ {Number(p.amount).toLocaleString()}
                  </div>

                  <button
                    onClick={() =>
                      deletePayment(p.id, p.client.name, p.amount)
                    }
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #ccc",
                      background: "#fff",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
