import "dotenv/config";
import { describe, it, expect } from "vitest";

const BASE = process.env.AFOS_BASE_URL ?? "http://127.0.0.1:3000";
const EMAIL = process.env.SEED_ADMIN_EMAIL ?? "stella.trusova@gmail.com";
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "stella.trusova@gmail.com";
const YEAR = 2026;
const CLOSED_MONTH = 3;
const OPEN_MONTH = 4;

// Minimal cookie jar (one cookie)
function extractCookie(setCookie: string | null): string {
  if (!setCookie) throw new Error("Missing Set-Cookie header");
  return setCookie.split(";")[0]; // "afos_session=..."
}

async function postJson(path: string, body: any, cookie?: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { res, text, json };
}

async function getJson(path: string, cookie?: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: cookie ? { Cookie: cookie } : undefined,
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { res, text, json };
}

describe("Billing period enforcement (integration)", () => {
  it("rejects payment creation in a closed period (409)", async () => {
    // 1) Login
    const login = await postJson("/api/auth/login", { email: EMAIL, password: PASSWORD });
    console.log("LOGIN_STATUS:", login.res.status);
    console.log("LOGIN_SET_COOKIE:", login.res.headers.get("set-cookie"));
    console.log("LOGIN_TEXT:", login.text);

    console.log("LOGIN_AS:", { EMAIL, PASSWORD: PASSWORD ? "***" : "(missing)", SEED_ADMIN_PASSWORD_PRESENT: !!process.env.SEED_ADMIN_PASSWORD });
expect(login.res.status).toBe(200);

    const cookie = extractCookie(login.res.headers.get("set-cookie"));

    // 2) Confirm billing period is closed
    const billing = await getJson(`/api/billing?year=${YEAR}&month=${CLOSED_MONTH}`, cookie);
    expect(billing.res.status).toBe(200);
    expect(billing.json?.isClosed).toBe(true);

    // 3) Get a client id
    const clients = await getJson("/api/clients", cookie);
    expect(clients.res.status).toBe(200);
    const clientId = clients.json?.clients?.[0]?.id;
    expect(typeof clientId).toBe("string");
    expect(clientId.length).toBeGreaterThan(5);

    const amount = 100 + Math.floor(Math.random() * 100000);

    // 4) Attempt payment create → must be 409
    const pay = await postJson(
      "/api/payments",
      { clientId, amount, year: YEAR, month: CLOSED_MONTH },
      cookie
    );

    expect(pay.res.status).toBe(409);
    expect((pay.json?.error || pay.text).toLowerCase()).toContain("closed");
  });

  it("allows payment creation in an open period (201)", async () => {
    // 1) Login
    const login = await postJson("/api/auth/login", { email: EMAIL, password: PASSWORD });
    console.log("LOGIN_STATUS:", login.res.status);
    console.log("LOGIN_SET_COOKIE:", login.res.headers.get("set-cookie"));
    console.log("LOGIN_TEXT:", login.text);

expect(login.res.status).toBe(200);

    const cookie = extractCookie(login.res.headers.get("set-cookie"));

    // 2) Confirm billing period is open
    const billing = await getJson(`/api/billing?year=${YEAR}&month=${OPEN_MONTH}`, cookie);
    expect(billing.res.status).toBe(200);
    expect(billing.json?.isClosed).toBe(false);

    // 3) Get a client id
    const clients = await getJson("/api/clients", cookie);
    expect(clients.res.status).toBe(200);
    const clientId = clients.json?.clients?.[0]?.id;
    expect(typeof clientId).toBe("string");
    expect(clientId.length).toBeGreaterThan(5);

    const amount = 100 + Math.floor(Math.random() * 100000);

    // 4) Create payment → must be 201
    const pay = await postJson(
      "/api/payments",
      { clientId, amount, year: YEAR, month: OPEN_MONTH },
      cookie
    );

    if (pay.res.status !== 201) { console.log("OPEN PERIOD FAIL:", pay.res.status, pay.text); }
    expect(pay.res.status).toBe(201);
  });
});
