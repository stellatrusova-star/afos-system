export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { POST as sendReminders } from "@/app/api/reminders/send/route";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("afos_session");

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.value },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden (ADMIN only)" }, { status: 403 });
    }

    const { year, month } = await req.json();

    const secret = process.env.REMINDERS_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Reminders not configured (missing REMINDERS_SECRET)" }, { status: 501 });
    }

    const url = new URL(req.url);
    url.pathname = "/api/reminders/send";
    url.searchParams.set("year", String(year));
    url.searchParams.set("month", String(month));

    const innerReq = new Request(url.toString(), {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });

    return await sendReminders(innerReq);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to trigger reminders" }, { status: 500 });
  }
}
