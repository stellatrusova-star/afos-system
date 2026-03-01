"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type BillingResponse = {
  year: number;
  month: number;
  periodId?: string;
  isClosed?: boolean;
  closedAt?: string | null;
  closedById?: string | null;
};

function monthLabel(m: number) {
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return names[m - 1] ?? `M${m}`;
}

export default function BillingPage() {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);

  const [data, setData] = useState<BillingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const years = useMemo(() => {
    const y = now.getFullYear();
    return [y - 1, y, y + 1];
  }, [now]);

  async function load(y: number, m: number) {
    setErr(null);
    setLoading(true);
    const res = await fetch(`/api/billing?year=${y}&month=${m}`);
    const json = (await res.json()) as BillingResponse;
    setData(json);
    setLoading(false);
  }

  async function closePeriod() {
    if (!data) return;
    if (data.isClosed) return;

    const ok = window.confirm(`Close billing period ${monthLabel(month)} ${year}? This will lock payments for this month.`);
    if (!ok) return;

    setErr(null);
    setClosing(true);

    const res = await fetch("/api/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month }),
    });

    const json = await res.json();
    if (!res.ok) {
      setErr(json?.error || "Failed to close billing period");
      setClosing(false);
      return;
    }

    await load(year, month);
    setClosing(false);
  }

  useEffect(() => {
    load(year, month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  const isClosed = Boolean(data?.isClosed);

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Billing Period</h1>
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
              load(y, month);
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
              load(year, m);
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

      {err && (
        <div style={{ marginTop: 14, padding: 12, border: "1px solid #f1b5b5", borderRadius: 12, background: "#fff0f0" }}>
          <div style={{ fontWeight: 800 }}>Error</div>
          <div style={{ opacity: 0.8, marginTop: 4, fontSize: 13 }}>{err}</div>
        </div>
      )}

      <div style={{ marginTop: 18, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
        <div style={{ fontSize: 14, opacity: 0.7 }}>Status</div>
        <div style={{ fontSize: 20, fontWeight: 800 }}>{isClosed ? "CLOSED" : "OPEN"}</div>

        {isClosed && (
          <div style={{ marginTop: 10, opacity: 0.8, fontSize: 13 }}>
            Closed at: {data?.closedAt ? new Date(data.closedAt).toISOString() : "—"}
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <button
            onClick={closePeriod}
            disabled={isClosed || closing}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #ccc",
              background: isClosed ? "#f7f7f7" : "#fff",
              opacity: isClosed ? 0.6 : 1,
              cursor: isClosed ? "not-allowed" : "pointer",
              fontWeight: 800,
            }}
            title={isClosed ? "Already closed" : "Close this billing period (ADMIN only)"}
          >
            {closing ? "Closing..." : "Close Billing Period"}
          </button>
        </div>

        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>
          Note: only ADMIN accounts can close a billing period. If you’re not ADMIN, the server will return 403.
        </div>
      </div>
    </div>
  );
}
