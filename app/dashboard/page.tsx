import Link from "next/link";

export default function DashboardPage() {
  return (
    <main style={{ fontFamily: "Arial", padding: 40 }}>
      <h1 style={{ fontSize: 42 }}>Dashboard</h1>

      <p style={{ fontSize: 18, marginTop: 10 }}>
        Accountant-grade payment tracking.
      </p>

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
