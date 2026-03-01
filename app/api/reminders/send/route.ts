export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { Role } from "@prisma/client";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

function buildMessage(name: string, amount: number, year: number, month: number) {
  const label = `${year}-${String(month).padStart(2, "0")}`;
  return `Hi ${name},

Just a quick reminder that your monthly payment of ₱ ${amount.toLocaleString()} is still marked as UNPAID for ${label}.

If you’ve already paid, please ignore this message and let us know so we can update our records.

Thank you!`;
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

export async function POST(req: Request) {
  // auth gate
  const auth = req.headers.get("authorization");
  if (!process.env.REMINDERS_SECRET) {
    return NextResponse.json({ error: "Reminders not configured (missing REMINDERS_SECRET)" }, { status: 501 });
  }
  if (auth !== `Bearer ${process.env.REMINDERS_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // env gate (email)
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass) {
    return NextResponse.json({ error: "Reminders not configured (missing SMTP env vars)" }, { status: 501 });
  }

  // env gate (db)
  if (!(process.env.DATABASE_URL || process.env.PG_DATABASE_URL)) {
    return NextResponse.json({ error: "Reminders not configured (missing DATABASE_URL)" }, { status: 501 });
  }

  try {
  // period selection (explicit via query or defaults to current)
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

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  // Month-aware: pull clients with UNPAID status for that BillingPeriod
  const unpaid = await prisma.clientStatusByMonth.findMany({
    where: {
      billingPeriodId: period.id,
      status: "UNPAID",
    },
    include: {
      client: { select: { name: true, monthlyFee: true } },
    },
  });

  let sent = 0;

  for (const row of unpaid) {
    await transporter.sendMail({
      from,
      to: process.env.REMINDERS_TO || user,
      subject: `Payment reminder (${year}-${String(month).padStart(2, "0")})`,
      text: buildMessage(row.client.name, row.client.monthlyFee, year, month),
    });
    sent += 1;
  }

  await prisma.auditLog.create({
    data: {
      entityType: "Reminders",
      entityId: period.id,
      action: "SEND",
      meta: { year, month, sent, unpaidCount: unpaid.length },
    },
  });

  return NextResponse.json({ ok: true, year, month, sent });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json(
      { ok: false, name: (e instanceof Error ? e.name : undefined), code: (e && typeof e === "object" && "code" in e ? (e as { code?: unknown }).code : undefined), message: (e instanceof Error ? e.message : String(e)) },
      { status: 500 }
    );
  }
}

