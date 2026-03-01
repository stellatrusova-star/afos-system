export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { Role } from "@prisma/client";

async function getOrCreatePeriod(year: number, month: number) {
  let period = await prisma.billingPeriod.findUnique({
    where: { year_month: { year, month } },
  });
  if (!period) {
    period = await prisma.billingPeriod.create({ data: { year, month } });
  }
  return period;
}

export async function POST(req: Request) {
  const auth = await requireUser({ roles: [Role.ADMIN, Role.MANAGER] });
  if (auth.error) return auth.error;

  try {
    const body = await req.json();

    const clientId = typeof body?.clientId === "string" ? body.clientId : String(body?.clientId ?? "");
    const amount = typeof body?.amount === "string" ? Number(body.amount) : body?.amount;
    const year = Number(body?.year);
    const month = Number(body?.month);

    if (!clientId) return NextResponse.json({ error: "Missing or invalid clientId" }, { status: 400 });
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Missing or invalid amount" }, { status: 400 });
    }
    if (!Number.isInteger(year) || year < 2000 || year > 3000) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    }

    const period = await getOrCreatePeriod(year, month);
    if (period.isClosed) return NextResponse.json({ error: "Billing period is closed" }, { status: 409 });

    const idempotencyKey = req.headers.get("idempotency-key") || undefined;

    if (idempotencyKey) {
      const existing = await prisma.payment.findUnique({ where: { idempotencyKey } });
      if (existing) return NextResponse.json({ ok: true, payment: existing }, { status: 200 });
    }

    const paidAt = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));

    const created = await prisma.payment.create({
      data: {
        clientId,
        billingPeriodId: period.id,
        amount,
        paidAt,
        ...(idempotencyKey ? { idempotencyKey } : {}),
      },
    });

    return NextResponse.json({ ok: true, payment: created }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to create payment", detail: msg }, { status: 500 });
  }
}

// keep GET minimal so it doesn't block compilation if it's unused
export async function GET() {
  const auth = await requireUser({ roles: [Role.ADMIN, Role.MANAGER] });
  if (auth.error) return auth.error;

  const payments = await prisma.payment.findMany({
    where: { deletedAt: null },
    orderBy: { paidAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ ok: true, payments }, { status: 200 });
}
