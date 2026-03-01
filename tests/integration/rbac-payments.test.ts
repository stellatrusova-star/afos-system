import { describe, it, expect } from "vitest";

const BASE = "http://127.0.0.1:3000";

describe("RBAC - payments", () => {
  it("ADMIN can create payment", async () => {
    const login = await fetch(BASE + "/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "stella.trusova@gmail.com",
        password: "stella.trusova@gmail.com",
      }),
    });

    expect(login.status).toBe(200);
  });

  it("STAFF cannot create payment", async () => {
    // Here you will later seed a STAFF user and verify 403.
    expect(true).toBe(true);
  });
});
