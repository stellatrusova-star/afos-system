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

export async function GET(req: Request) {
  const auth = await requireUser({ roles: [Role.ADMIN, Role.MANAGER] });
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));

  if (!Number.isInteger(year) || year < 2000 || year > 3000) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }

  try {
    const period = await getOrCreatePeriod(year, month);
    return NextResponse.json(
      { ok: true, periodId: period.id, year, month, isClosed: period.isClosed },
      { status: 200 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to fetch billing period", detail: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireUser({ roles: [Role.ADMIN] });
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const year = Number(body?.year);
    const month = Number(body?.month);

    if (!Number.isInteger(year) || year < 2000 || year > 3000) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    }

    const period = await getOrCreatePeriod(year, month);

    if (period.isClosed) {
      return NextResponse.json(
        { ok: true, periodId: period.id, year, month, isClosed: true },
        { status: 200 }
      );
    }

    const updated = await prisma.billingPeriod.update({
      where: { id: period.id },
      data: { isClosed: true, closedAt: new Date(), closedById: auth.user.id },
      select: { id: true, year: true, month: true, isClosed: true, closedAt: true, closedById: true },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "BillingPeriod",
        entityId: updated.id,
        action: "CLOSE",
        meta: { actorUserId: auth.user.id, year: updated.year, month: updated.month },
      },
    });

    return NextResponse.json(
      {
        ok: true,
        periodId: updated.id,
        year: updated.year,
        month: updated.month,
        isClosed: updated.isClosed,
        closedAt: updated.closedAt,
        closedById: updated.closedById,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to close billing period", detail: msg }, { status: 500 });
  }
}
