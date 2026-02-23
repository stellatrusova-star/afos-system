import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const r = await prisma.$queryRaw`SELECT 1 as ok`;
    return NextResponse.json({ ok: true, result: r });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, name: e?.name, code: e?.code, message: String(e?.message || e) },
      { status: 500 }
    );
  }
}
