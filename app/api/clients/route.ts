export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { Role } from "@prisma/client";

export async function GET(_req: Request) {
  const auth = await requireUser({ roles: [Role.ADMIN] });
  if (auth.error) return auth.error;

  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, monthlyFee: true },
  });

  return NextResponse.json({ ok: true, clients }, { status: 200 });
}

export async function POST(req: Request) {
  const auth = await requireUser({ roles: [Role.ADMIN] });
  if (auth.error) return auth.error;

  try {
    const body = await req.json();

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const emailRaw = body?.email;
    const email =
      emailRaw === null || emailRaw === undefined || String(emailRaw).trim() === ""
        ? null
        : String(emailRaw).trim();

    const monthlyFeeRaw = body?.monthlyFee;
    const monthlyFee = typeof monthlyFeeRaw === "string" ? Number(monthlyFeeRaw) : monthlyFeeRaw;

    if (!name) return NextResponse.json({ error: "Missing or invalid name" }, { status: 400 });
    if (email !== null && !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (typeof monthlyFee !== "number" || !Number.isFinite(monthlyFee) || monthlyFee <= 0) {
      return NextResponse.json({ error: "Missing or invalid monthlyFee" }, { status: 400 });
    }

    const created = await prisma.client.create({
      data: { name, email, monthlyFee: Math.trunc(monthlyFee) },
      select: { id: true, name: true, email: true, monthlyFee: true, createdAt: true },
    });

    return NextResponse.json({ ok: true, client: created }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to create client", detail: msg }, { status: 500 });
  }
}
