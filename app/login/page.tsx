"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const e1 = email.trim();
    const p1 = password;

    if (!e1 || !p1) {
      setErr("Email and password required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: e1, password: p1 }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErr(data?.error || "Login failed.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setErr("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ fontFamily: "Arial", padding: 40, maxWidth: 420, margin: "0 auto" }}>
      <h1 style={{ fontSize: 36 }}>Login</h1>

      <form onSubmit={onSubmit} style={{ marginTop: 20, display: "grid", gap: 10 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          style={{ padding: 12, borderRadius: 10, border: "1px solid #333" }}
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          autoComplete="current-password"
          style={{ padding: 12, borderRadius: 10, border: "1px solid #333" }}
        />

        {err ? <div style={{ color: "crimson", fontSize: 14 }}>{err}</div> : null}

        <button
          type="submit"
          disabled={loading}
          style={{ padding: 12, borderRadius: 10, border: "1px solid #333", opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </main>
  );
}
