"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Client = {
  id: string;
  name: string;
  email?: string;
  monthlyFee: number;
  status: "PAID" | "UNPAID";
};

type Payment = {
  id: string;
  clientId: string;
  clientName: string;
  amount: number;
  date: string; // YYYY-MM-DD
};

const CLIENTS_KEY = "afos_clients_v1";
const PAYMENTS_KEY = "afos_payments_v1";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function genId() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = typeof crypto !== "undefined" ? crypto : null;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function loadClients(defaultClients: Client[]) {
  try {
    const raw = localStorage.getItem(CLIENTS_KEY);
    if (!raw) return defaultClients;
    const parsed = JSON.parse(raw) as Client[];
    return Array.isArray(parsed) ? parsed : defaultClients;
  } catch {
    return defaultClients;
  }
}

function saveClients(clients: Client[]) {
  try {
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  } catch {
    // ignore
  }
}

function appendPayment(c: Client) {
  const p: Payment = {
    id: genId(),
    clientId: c.id,
    clientName: c.name,
    amount: c.monthlyFee,
    date: todayISO(),
  };

  try {
    const raw = localStorage.getItem(PAYMENTS_KEY);
    const arr = raw ? (JSON.parse(raw) as Payment[]) : [];
    const safeArr = Array.isArray(arr) ? arr : [];
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify([p, ...safeArr]));
  } catch {
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify([p]));
  }

  window.dispatchEvent(new Event("afos_payments_updated"));
}

function buildReminderMessage(c: Client) {
  const d = todayISO();
  return `Hi ${c.name},

Just a quick reminder that your monthly payment of ₱ ${Number(c.monthlyFee).toLocaleString()} is still marked as UNPAID as of ${d}.

If you’ve already paid, please ignore this message and let us know so we can update our records.

Thank you!`;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    alert("Copied!");
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      alert("Copied!");
    } catch {
      alert("Copy failed.");
    }
  }
}

export default function ClientsPage() {
  const defaultClients: Client[] = [
    { id: "a", name: "Client A", email: "", monthlyFee: 5000, status: "UNPAID" as const },
    { id: "b", name: "Client B", email: "", monthlyFee: 8000, status: "PAID" as const },
    { id: "c", name: "Client C", email: "", monthlyFee: 6500, status: "UNPAID" as const },
  ];

  const [clients, setClients] = useState<Client[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [fee, setFee] = useState("");

  // Record payment modal
  const [payOpen, setPayOpen] = useState(false);
  const [payClientId, setPayClientId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<string>("");
  const [payDate, setPayDate] = useState<string>(todayISO());


  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"ALL" | "PAID" | "UNPAID">("ALL");
  const [sort, setSort] = useState<"NAME" | "FEE_DESC" | "FEE_ASC">("NAME");

  useEffect(() => {
    const loaded = loadClients(defaultClients).map((c) => ({ ...c, email: c.email ?? "" }));
    setClients(loaded);
    saveClients(loaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (clients.length > 0) saveClients(clients);
  }, [clients]);

  const totals = useMemo(() => {
    const total = clients.reduce((s, c) => s + (Number(c.monthlyFee) || 0), 0);
    const paid = clients.filter((c) => c.status === "PAID").reduce((s, c) => s + (Number(c.monthlyFee) || 0), 0);
    const unpaid = total - paid;
    return { total, paid, unpaid };
  }, [clients]);

  const filteredClients = useMemo(() => {
    const query = q.trim().toLowerCase();

    let arr = clients;

    if (filter !== "ALL") {
      arr = arr.filter((c) => c.status === filter);
    }

    if (query) {
      arr = arr.filter((c) => {
        const hay = `${c.name} ${c.email ?? ""}`.toLowerCase();
        return hay.includes(query);
      });
    }

    const sorted = [...arr].sort((a, b) => {
      if (sort === "NAME") return a.name.localeCompare(b.name);
      if (sort === "FEE_DESC") return (b.monthlyFee || 0) - (a.monthlyFee || 0);
      return (a.monthlyFee || 0) - (b.monthlyFee || 0);
    });

    return sorted;
  }, [clients, q, filter, sort]);

  const unpaidClients = useMemo(() => clients.filter((c) => c.status === "UNPAID"), [clients]);

  function addClient() {
    const monthlyFee = Number(fee);
    if (!name.trim()) return alert("Enter client name.");
    if (!Number.isFinite(monthlyFee) || monthlyFee <= 0) return alert("Enter valid fee.");

    const c: Client = {
      id: genId(),
      name: name.trim(),
      email: email.trim(),
      monthlyFee,
      status: "UNPAID" as const,
    };

    setClients((prev) => {
      const next = [c, ...prev];
      saveClients(next);
      return next;
    });

    setName("");
    setEmail("");
    setFee("");
  }

  function removeClient(id: string) {
    setClients((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveClients(next);
      return next;
    });
  }

  function markPaid(id: string) {
    setClients((prev) => {
      const next = prev.map((c) => {
        if (c.id !== id) return c;
        if (c.status === "PAID") return c; // already paid
        const paidClient = { ...c, status: "PAID" as const };
        appendPayment(paidClient);
        return paidClient;
      });
      saveClients(next);
      return next;
    });
  }

  function markUnpaid(id: string) {
    setClients((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, status: "UNPAID" as const } : c));
      saveClients(next);
      return next;
    });
  }

  function updateEmail(id: string, nextEmail: string) {
    setClients((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, email: nextEmail } : c));
      saveClients(next);
      return next;
    });
  }

  function mailtoLink(c: Client) {
    const subject = encodeURIComponent("Payment reminder");
    const body = encodeURIComponent(buildReminderMessage(c));
    const to = encodeURIComponent((c.email || "").trim());
    return `mailto:${to}?subject=${subject}&body=${body}`;
  }

  function openPayModal(c: Client) {
    setPayClientId(c.id);
    setPayAmount(String(c.monthlyFee || ""));
    setPayDate(todayISO());
    setPayOpen(true);
  }

  function confirmPay() {
    if (!payClientId) return;
    const amt = Number(payAmount);
    if (!Number.isFinite(amt) || amt <= 0) return alert("Enter a valid amount.");

    markPaid(payClientId);

    setPayOpen(false);
    setPayClientId(null);
  }


  async function copyAllReminders() {
    if (unpaidClients.length === 0) return alert("No unpaid clients.");
    const text = unpaidClients.map((c) => `--- ${c.name} ---\n${buildReminderMessage(c)}\n`).join("\n");
    await copyText(text);
  }

  return (
    <div className="stack">
      <div className="card card-pad">
        <div className="row">
          <div>
            <h1 className="h1">Clients</h1>
            <div className="sub">
              Use <b>Record payment</b> to safely mark PAID (it also writes to Payments history).
            </div>
          </div>
          <Link className="btn" href="/dashboard">
            Back
          </Link>
        </div>
      </div>

      <div className="grid-3">
        <div className="card card-pad">
          <div className="kpi-label">Total</div>
          <div className="kpi-value">₱ {totals.total.toLocaleString()}</div>
        </div>
        <div className="card card-pad">
          <div className="kpi-label">Paid</div>
          <div className="kpi-value">₱ {totals.paid.toLocaleString()}</div>
        </div>
        <div className="card card-pad">
          <div className="kpi-label">Unpaid</div>
          <div className="kpi-value">₱ {totals.unpaid.toLocaleString()}</div>
        </div>
      </div>

      <div className="card card-pad">
        <div className="h2">Add client</div>
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 180px 140px", gap: 10 }}>
          <input className="input" placeholder="Client name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input" placeholder="Monthly fee" inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value)} />
          <button className="btn btn-primary" type="button" onClick={addClient}>
            Add
          </button>
        </div>
      </div>

      <div className="card card-pad">
        <div className="row">
          <div>
            <div className="h2">Reminders (UNPAID only)</div>
            <div className="sub">Copy or email reminders quickly.</div>
          </div>
          <button className="btn" type="button" onClick={copyAllReminders} disabled={unpaidClients.length === 0} style={{ opacity: unpaidClients.length === 0 ? 0.55 : 1 }}>
            Copy all reminders
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          {unpaidClients.length === 0 ? (
            <div className="footer-note">No unpaid clients 🎉</div>
          ) : (
            <div className="list">
              {unpaidClients.map((c) => (
                <div key={c.id} className="item" style={{ alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="row" style={{ alignItems: "flex-start" }}>
                      <div>
                        <div className="item-title">{c.name}</div>
                        <div className="item-sub">₱ {Number(c.monthlyFee).toLocaleString()} / month</div>
                      </div>
                      <span className="pill pill-unpaid">UNPAID</span>
                    </div>

                    <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <input className="input" placeholder="Email (optional)" value={c.email || ""} onChange={(e) => updateEmail(c.id, e.target.value)} style={{ maxWidth: 360 }} />
                      <button className="btn" type="button" onClick={() => copyText(buildReminderMessage(c))}>
                        Copy reminder
                      </button>
                      <a
                        className="btn"
                        href={c.email?.trim() ? mailtoLink(c) : undefined}
                        onClick={(e) => {
                          if (!c.email?.trim()) {
                            e.preventDefault();
                            alert("Add an email first. Or use Copy reminder.");
                          }
                        }}
                      >
                        Email reminder
                      </a>
                    </div>

                    <div className="pre" style={{ marginTop: 10 }}>
                      {buildReminderMessage(c)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card card-pad">
        <div className="row">
          <div>
            <div className="h2">Client list</div>
            <div className="sub">Search, filter, and record payments safely.</div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input className="input" placeholder="Search name/email…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 260 }} />
            <select className="select" value={filter} onChange={(e) => setFilter(e.target.value as any)} style={{ width: 160 }}>
              <option value="ALL">All</option>
              <option value="PAID">Paid</option>
              <option value="UNPAID">Unpaid</option>
            </select>
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value as any)} style={{ width: 200 }}>
              <option value="NAME">Sort: Name</option>
              <option value="FEE_DESC">Sort: Fee (high → low)</option>
              <option value="FEE_ASC">Sort: Fee (low → high)</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          {filteredClients.length === 0 ? (
            <div className="footer-note">No clients match your filter.</div>
          ) : (
            <div className="list">
              {filteredClients.map((c) => {
                const isPaid = c.status === "PAID";
                return (
                  <div key={c.id} className="item">
                    <div style={{ minWidth: 0 }}>
                      <div className="item-title">{c.name}</div>
                      <div className="item-sub">
                        ₱ {Number(c.monthlyFee).toLocaleString()} / month {c.email?.trim() ? `• ${c.email}` : ""}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <span className={`pill ${isPaid ? "pill-paid" : "pill-unpaid"}`}>{c.status}</span>

                      <button className="btn btn-primary" type="button" onClick={() => openPayModal(c)} disabled={isPaid} style={{ opacity: isPaid ? 0.55 : 1 }}>
                        Record payment
                      </button>

                      <button className="btn" type="button" onClick={() => markUnpaid(c.id)} disabled={!isPaid} style={{ opacity: !isPaid ? 0.55 : 1 }}>
                        Mark UNPAID
                      </button>

                      <button className="btn" type="button" onClick={() => removeClient(c.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="footer-note">
          Note: “Record payment” is the safe action. It writes to Payments history and marks the client as PAID.
        </div>
      </div>

      {payOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 50,
          }}
          onClick={() => setPayOpen(false)}
        >
          <div className="card card-pad" style={{ width: "min(520px, 100%)" }} onClick={(e) => e.stopPropagation()}>
            <div className="row">
              <div>
                <div className="h2">Record payment</div>
                <div className="sub">Confirm details before marking as PAID.</div>
              </div>
              <button className="btn" type="button" onClick={() => setPayOpen(false)}>
                Close
              </button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div className="kpi-label">Amount</div>
                <input className="input" inputMode="numeric" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
              </div>
              <div>
                <div className="kpi-label">Date</div>
                <input className="input" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
              </div>
            </div>

            <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="btn" type="button" onClick={() => setPayOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" type="button" onClick={confirmPay}>
                Confirm payment
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
