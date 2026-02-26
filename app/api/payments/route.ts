import { NextResponse } from "next/server";
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

async function assertPeriodOpen(periodId: string) {
  const period = await prisma.billingPeriod.findUnique({ where: { id: periodId } });
  if (!period) throw new Error("BillingPeriod not found");
  if (period.isClosed) {
    const err: any = new Error("BillingPeriod is closed");
    err.code = "BILLING_PERIOD_CLOSED";
    throw err;
  }
  return period;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = Number(searchParams.get("year") ?? now.getFullYear());
    const month = Number(searchParams.get("month") ?? now.getMonth() + 1);

    await getOrCreatePeriod(year, month);

    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));

    const payments = await prisma.payment.findMany({
      where: {
        paidAt: { gte: start, lt: end },
        deletedAt: null,
      },
      orderBy: { paidAt: "desc" },
      include: {
        client: { select: { name: true } },
      },
    });

    logEvent({ event: "PAYMENTS_GET", route: "/api/payments", result: "ok", year, month, count: payments.length });
    return NextResponse.json({ year, month, payments });
  } catch (err: any) {
    logEvent({ event: "PAYMENTS_GET", route: "/api/payments", result: "err", message: String(err?.message || err) });
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const clientId = body?.clientId;
    const amount = body?.amount;

    const now = new Date();
    const year = Number(body?.year ?? now.getFullYear());
    const month = Number(body?.month ?? now.getMonth() + 1);

    if (!clientId || typeof clientId !== "string") {
      return NextResponse.json({ error: "Missing or invalid clientId" }, { status: 400 });
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Missing or invalid amount" }, { status: 400 });
    }

    if (!Number.isInteger(year) || year < 2000 || year > 3000) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    }

    const period = await getOrCreatePeriod(year, month);
    await assertPeriodOpen(period.id);

    const paidAt = new Date(
      Date.UTC(
        year,
        month - 1,
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds()
      )
    );

    // Duplicate payment guard (same client + same amount + same derived billing month, within 3 minutes)
    const windowMs = 3 * 60 * 1000;
    const since = new Date(paidAt.getTime() - windowMs);

    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));

    const dup = await prisma.payment.findFirst({
      where: {
        clientId,
        amount: Math.round(amount),
        deletedAt: null,
        paidAt: { gte: since },
        // ensure same derived month
        AND: [{ paidAt: { gte: start } }, { paidAt: { lt: end } }],
      },
      orderBy: { paidAt: "desc" },
    });

    if (dup) {
      logEvent({
        event: "PAYMENT_CREATE",
        route: "/api/payments",
        result: "err",
        reason: "duplicate_guard",
        clientId,
        amount: Math.round(amount),
        year,
        month,
        dupId: dup.id,
      });
      return NextResponse.json({ error: "Duplicate payment blocked" }, { status: 409 });
    }

    const payment = await prisma.payment.create({
      data: { clientId, amount: Math.round(amount), paidAt },
    });

    await prisma.clientStatusByMonth.upsert({
      where: {
        clientId_billingPeriodId: {
          clientId,
          billingPeriodId: period.id,
        },
      },
      update: { status: "PAID" },
      create: {
        clientId,
        billingPeriodId: period.id,
        status: "PAID",
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "Payment",
        entityId: payment.id,
        action: "CREATE",
        meta: { clientId, amount: Math.round(amount), year, month },
      },
    });

    logEvent({ event: "PAYMENT_CREATE", route: "/api/payments", result: "ok", paymentId: payment.id, clientId, year, month });
    return NextResponse.json({ ok: true, payment }, { status: 201 });
  } catch (err: any) {
    const code = err?.code;
    if (code === "BILLING_PERIOD_CLOSED") {
      logEvent({ event: "PAYMENT_CREATE", route: "/api/payments", result: "err", reason: "period_closed" });
      return NextResponse.json({ error: "Billing period is closed" }, { status: 409 });
    }
    logEvent({ event: "PAYMENT_CREATE", route: "/api/payments", result: "err", message: String(err?.message || err) });
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const paymentId = body?.paymentId;
    const reason = typeof body?.reason === "string" ? body.reason : null;

    if (!paymentId || typeof paymentId !== "string") {
      return NextResponse.json({ error: "Missing or invalid paymentId" }, { status: 400 });
    }

    const existing = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { client: { select: { id: true } } },
    });

    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const paidAt = new Date(existing.paidAt);
    const year = paidAt.getUTCFullYear();
    const month = paidAt.getUTCMonth() + 1;

    const period = await getOrCreatePeriod(year, month);
    await assertPeriodOpen(period.id);

    await prisma.$transaction(async (tx) => {
      // snapshot pre-delete
      await tx.auditLog.create({
        data: {
          entityType: "Payment",
          entityId: paymentId,
          action: "SOFT_DELETE",
          meta: {
            snapshot: {
              id: existing.id,
              clientId: existing.clientId,
              amount: existing.amount,
              paidAt: existing.paidAt,
              deletedAt: null,
            },
            year,
            month,
            reason,
          },
        },
      });

      await tx.payment.update({
        where: { id: paymentId },
        data: {
          deletedAt: new Date(),
          deleteReason: reason,
          deletedById: null,
        },
      });
    });

    // If no remaining (non-deleted) payments for this client in that month, revert status
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));

    const remaining = await prisma.payment.count({
      where: {
        clientId: existing.clientId,
        deletedAt: null,
        paidAt: { gte: start, lt: end },
      },
    });

    if (remaining === 0) {
      await prisma.clientStatusByMonth.upsert({
        where: {
          clientId_billingPeriodId: {
            clientId: existing.clientId,
            billingPeriodId: period.id,
          },
        },
        update: { status: "UNPAID" },
        create: {
          clientId: existing.clientId,
          billingPeriodId: period.id,
          status: "UNPAID",
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        entityType: "Payment",
        entityId: paymentId,
        action: "DELETE_REQUEST",
        meta: { clientId: existing.clientId, amount: existing.amount, year, month, remaining },
      },
    });

    logEvent({ event: "PAYMENT_DELETE", route: "/api/payments", result: "ok", paymentId, year, month, remaining });
    return NextResponse.json({ ok: true, remaining });
  } catch (err: any) {
    const code = err?.code;
    if (code === "BILLING_PERIOD_CLOSED") {
      logEvent({ event: "PAYMENT_DELETE", route: "/api/payments", result: "err", reason: "period_closed" });
      return NextResponse.json({ error: "Billing period is closed" }, { status: 409 });
    }
    logEvent({ event: "PAYMENT_DELETE", route: "/api/payments", result: "err", message: String(err?.message || err) });
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
  }
}
