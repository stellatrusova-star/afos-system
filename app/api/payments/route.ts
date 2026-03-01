export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOpenPeriod } from "@/lib/guards/requireOpenPeriod";

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
    const err = new Error("BillingPeriod is closed") as Error & { code?: string };
    err.code = "BILLING_PERIOD_CLOSED";
    throw err;
  }
  return period;
}

export async function GET(req: Request) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const user = auth.user;
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
          userId: user.id,
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
          deletedById: user.id,
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
        userId: user.id,
        entityType: "Payment",
        entityId: paymentId,
        action: "DELETE_REQUEST",
        meta: { clientId: existing.clientId, amount: existing.amount, year, month, remaining },
      },
    });

    logEvent({ event: "PAYMENT_DELETE", route: "/api/payments", result: "ok", paymentId, year, month, remaining });
    return NextResponse.json({ ok: true, remaining });
  }
  catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? (err as { code?: unknown }).code
        : undefined;
    if (code === "BILLING_PERIOD_CLOSED") {
      logEvent({ event: "PAYMENT_DELETE", route: "/api/payments", result: "err", reason: "period_closed" });
      return NextResponse.json({ error: "Billing period is closed" }, { status: 409 });
    }
    logEvent({ event: "PAYMENT_DELETE", route: "/api/payments", result: "err", message: (err instanceof Error ? err.message : String(err)) });
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
  }
}
