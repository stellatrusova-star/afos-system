import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Hard stop: if the billing period is closed, throw an error.
 * Assumes a BillingPeriod-like table OR equivalent query exists.
 *
 * If your schema differs:
 * - Update the prisma query below to match your actual table/model.
 */
export async function requireOpenPeriod(year: number, month: number) {
  // --- CHANGE THIS QUERY IF YOUR MODEL NAME/SHAPE DIFFERS ---
  // Common patterns:
  // 1) prisma.billingPeriod.findUnique({ where: { year_month: { year, month } } })
  // 2) prisma.billingPeriod.findFirst({ where: { year, month } })
  // 3) prisma.billingPeriod.findUnique({ where: { year, month } }) (if composite unique)
  const period =
    (await (prisma as any).billingPeriod?.findFirst?.({ where: { year, month } })) ??
    (await (prisma as any).billingPeriod?.findUnique?.({ where: { year, month } }));

  const isClosed = Boolean(period?.isClosed ?? period?.closed ?? period?.status === "CLOSED");

  if (isClosed) {
    const err: any = new Error("BILLING_PERIOD_CLOSED");
    err.code = "BILLING_PERIOD_CLOSED";
    err.status = 409;
    err.meta = { year, month };
    throw err;
  }
}
