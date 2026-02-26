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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const now = new Date();
    const year = Number(searchParams.get("year") ?? now.getFullYear());
    const month = Number(searchParams.get("month") ?? now.getMonth() + 1);

    const period = await getOrCreatePeriod(year, month);

    const clients = await prisma.client.findMany({
      include: {
        monthlyStatuses: {
          where: { billingPeriodId: period.id },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // If the period is closed, do NOT mutate status rows during reads.
    if (!period.isClosed) {
      for (const c of clients) {
        if (c.monthlyStatuses.length === 0) {
          await prisma.clientStatusByMonth.create({
            data: {
              clientId: c.id,
              billingPeriodId: period.id,
            },
          });
        }
      }
    }

    const refreshed = await prisma.client.findMany({
      include: {
        monthlyStatuses: {
          where: { billingPeriodId: period.id },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    logEvent({ event: "CLIENTS_GET", route: "/api/clients", result: "ok", year, month, count: refreshed.length, isClosed: period.isClosed });

    return NextResponse.json({
      year,
      month,
      isClosed: period.isClosed,
      clients: refreshed.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        monthlyFee: c.monthlyFee,
        createdAt: c.createdAt,
        status: c.monthlyStatuses[0]?.status ?? "UNPAID",
      })),
    });
  } catch (err: any) {
    logEvent({ event: "CLIENTS_GET", route: "/api/clients", result: "err", message: String(err?.message || err) });
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
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

    logEvent({ event: "CLIENT_CREATE", route: "/api/clients", result: "ok", clientId: created.id });
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    logEvent({ event: "CLIENT_CREATE", route: "/api/clients", result: "err", message: String(err?.message || err) });
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
