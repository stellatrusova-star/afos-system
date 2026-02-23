import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

function buildMessage(name: string, amount: number) {
  const d = new Date().toISOString().slice(0, 10);
  return `Hi ${name},

Just a quick reminder that your monthly payment of ₱ ${amount.toLocaleString()} is due as of ${d}.

If you’ve already paid, please ignore this message and let us know so we can update our records.

Thank you!`;
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");

  if (!process.env.REMINDERS_SECRET) {
    return NextResponse.json({ error: "Reminders not configured (missing REMINDERS_SECRET)" }, { status: 501 });
  }

  if (auth !== `Bearer ${process.env.REMINDERS_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass) {
    return NextResponse.json({ error: "Reminders not configured (missing SMTP env vars)" }, { status: 501 });
  }

  if (!process.env.PG_DATABASE_URL) {
    return NextResponse.json({ error: "Reminders not configured (missing PG_DATABASE_URL)" }, { status: 501 });
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const clients = await prisma.client.findMany({
    select: { name: true, monthlyFee: true },
  });

  let sent = 0;

  for (const c of clients) {
    await transporter.sendMail({
      from,
      to: process.env.REMINDERS_TO || user,
      subject: "Payment reminder",
      text: buildMessage(c.name, c.monthlyFee),
    });
    sent += 1;
  }

  return NextResponse.json({ ok: true, sent });
}
