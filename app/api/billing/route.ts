export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function logEvent(data: Record<string, unknown>) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...data }));
}

async function getOrCreatePeriod(year: number, month: number) {
  let period = await prisma.billingPeriod.findUnique({
    where: { year_month: { year, month } },
  });

  if (!period) {
    period = await prisma.billingPeriod.create({
      data: { year, month },
    });
  }

  return period;
}

export async function GET(req: Request) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const user = auth.user;
        const body = await req.json();
    const now = new Date();
    const year = Number(body?.year ?? now.getFullYear());
    const month = Number(body?.month ?? now.getMonth() + 1);

    if (!Number.isInteger(year) || year < 2000 || year > 3000) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    }

    const period = await getOrCreatePeriod(year, month);

    if (period.isClosed) {
      return NextResponse.json({ error: "Billing period already closed" }, { status: 409 });
    }

    const closed = await prisma.billingPeriod.update({
      where: { id: period.id },
      data: {
        isClosed: true,
        closedAt: new Date(),
        closedById: user.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        entityType: "BillingPeriod",
        entityId: closed.id,
        action: "CLOSE",
        meta: { year, month },
      },
    });

    logEvent({ event: "BILLING_CLOSE", route: "/api/billing", result: "ok", year, month, periodId: closed.id });
    return NextResponse.json({ ok: true, periodId: closed.id, year, month, isClosed: true });
  } catch (err: any) {
    logEvent({ event: "BILLING_CLOSE", route: "/api/billing", result: "err", message: String(err?.message || err) });
    const msg = String(err?.message || err);
    if (/unauthorized|no session|invalid session|auth/i.test(msg)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to close billing period" }, { status: 500 });
  }
}
