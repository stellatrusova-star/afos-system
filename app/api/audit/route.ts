import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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
