export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireSession();
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(logs);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
