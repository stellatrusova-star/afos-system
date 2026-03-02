import { describe, it, expect } from "vitest";
import { authedFetch } from "./http";

describe("Clients duplicate email (integration)", () => {
  it("rejects creating two clients with the same email (409)", async () => {
    const email = "dupe@example.com";

    const first = await authedFetch("/api/clients", {
      method: "POST",
      body: JSON.stringify({ name: "One", email, monthlyFee: 1000 }),
    });
    expect(first.res.status).toBe(201);

    const second = await authedFetch("/api/clients", {
      method: "POST",
      body: JSON.stringify({ name: "Two", email, monthlyFee: 2000 }),
    });
    expect(second.res.status).toBe(409);
  });
});
