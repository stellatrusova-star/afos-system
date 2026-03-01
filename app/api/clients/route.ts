export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { requireRole } from "@/app/lib/authz";
import { Role } from "@prisma/client";
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
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const user = auth.user;
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
  } catch (err: unknown) {
    console.error(err);

    const meta =
      err && typeof err === "object"
        ? {
            name: "name" in err ? String((err as { name?: unknown }).name) : undefined,
            code: "code" in err ? String((err as { code?: unknown }).code) : undefined,
            message: "message" in err ? String((err as { message?: unknown }).message) : String(err),
          }
        : { message: String(err) };

    return NextResponse.json(
      {
        error: "Failed to create client",
        ...meta,
      },
      { status: 500 }
    );
  }
}
