import { prisma } from "@/lib/prisma";

/**
 * Hard stop: if the billing period is closed, throw a 409.
 * Assumes your BillingPeriod model is accessible via prisma.billingPeriod
 * and has fields year, month, isClosed.
 *
 * If your model differs, adjust ONLY the query/select below (still terminal-only).
 */
export async function requireOpenPeriod(year: number, month: number) {
  const period =
    (await (prisma as any).billingPeriod?.findFirst?.({
      where: { year, month },
      select: { isClosed: true }
    })) ??
    (await (prisma as any).billingPeriod?.findUnique?.({
      where: { year, month },
      select: { isClosed: true }
    }));

  const isClosed = Boolean(period?.isClosed);

  if (isClosed) {
    const err: any = new Error("Billing period is closed");
    err.code = "BILLING_PERIOD_CLOSED";
    err.status = 409;
    err.meta = { year, month };
    throw err;
  }
}
