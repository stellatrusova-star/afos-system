import { describe, it, expect } from "vitest";
import { authedFetch } from "./http";

describe("Clients (integration)", () => {
  it("allows ADMIN to create a client (201)", async () => {
    const res = await authedFetch("/api/clients", {
      method: "POST",
      body: JSON.stringify({
        name: "Acme Co",
        email: "acme@example.com",
        monthlyFee: 2500,
      }),
    });

    expect(res.res.status).toBe(201);
    expect(res.json?.ok).toBe(true);
    expect(res.json?.client?.name).toBe("Acme Co");
    expect(res.json?.client?.monthlyFee).toBe(2500);
  });
});
