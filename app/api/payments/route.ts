import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { paidAt: "desc" },
      include: {
        client: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json(payments);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const clientId = body?.clientId;
    const amount = body?.amount;

    if (!clientId || typeof clientId !== "string") {
      return NextResponse.json({ error: "Missing or invalid clientId" }, { status: 400 });
    }
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Missing or invalid amount" }, { status: 400 });
    }

    const payment = await prisma.payment.create({
      data: { clientId, amount: Math.round(amount) },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "Payment",
        entityId: payment.id,
        action: "CREATE",
        meta: { clientId, amount },
      },
    });

    return NextResponse.json({ ok: true, payment }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const paymentId = body?.paymentId;

    if (!paymentId || typeof paymentId !== "string") {
      return NextResponse.json({ error: "Missing or invalid paymentId" }, { status: 400 });
    }

    const existing = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    await prisma.payment.delete({
      where: { id: paymentId },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "Payment",
        entityId: paymentId,
        action: "DELETE",
        meta: { clientId: existing.clientId, amount: existing.amount },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
  }
}
