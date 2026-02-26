import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    const { searchParams } = new URL(req.url);

    const now = new Date();
    const year = Number(searchParams.get("year") ?? now.getFullYear());
    const month = Number(searchParams.get("month") ?? now.getMonth() + 1);

    if (!Number.isInteger(year) || year < 2000 || year > 3000) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    }

    const period = await getOrCreatePeriod(year, month);

    // Fetch clients once
    const clients = await prisma.client.findMany({
      include: {
        monthlyStatuses: {
          where: { billingPeriodId: period.id },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Create missing statuses in a safe way (idempotent via @@unique)
    const missing = clients.filter((c) => c.monthlyStatuses.length === 0);

    if (missing.length > 0) {
      await prisma.clientStatusByMonth.createMany({
        data: missing.map((c) => ({
          clientId: c.id,
          billingPeriodId: period.id,
          status: "UNPAID",
        })),
        skipDuplicates: true,
      });
    }

    // Re-fetch statuses only (cheap), not full clients twice
    const statuses = await prisma.clientStatusByMonth.findMany({
      where: { billingPeriodId: period.id },
      select: { clientId: true, status: true },
    });

    const statusMap = new Map(statuses.map((s) => [s.clientId, s.status]));

    return NextResponse.json({
      year,
      month,
      clients: clients.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        monthlyFee: c.monthlyFee,
        createdAt: c.createdAt,
        status: statusMap.get(c.id) ?? "UNPAID",
      })),
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      {
        error: "Failed to fetch clients",
        name: err?.name,
        code: err?.code,
        message: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body?.name) {
      return NextResponse.json({ error: "Missing name" }, { status: 400 });
    }

    const created = await prisma.client.create({
      data: {
        name: body.name,
        email: body.email ?? null,
        monthlyFee: body.monthlyFee ?? 0,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      {
        error: "Failed to create client",
        name: err?.name,
        code: err?.code,
        message: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}
