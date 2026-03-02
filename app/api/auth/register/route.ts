export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body?.email;
    const password = body?.password;

    if (!email || !password) {


      return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const userCount = await tx.user.count();
      const role = userCount === 0 ? "ADMIN" : "ACCOUNTANT";
      return tx.user.create({
        data: {
          email,
          password: hashed,
          role,
        },
      });
    });

    return NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
  } catch (err: unknown) {

    const meta =
      err && typeof err === "object"
        ? {
            name: "name" in err ? String((err as { name?: unknown }).name) : undefined,
            code: "code" in err ? String((err as { code?: unknown }).code) : undefined,
            message: "message" in err ? String((err as { message?: unknown }).message) : String(err),
          }
        : { message: String(err) };

      const code = meta.code;

      if (code === "P2002") {
        return NextResponse.json({ error: "Email already exists" }, { status: 409 });
      }

      // Only log unexpected errors
      console.error(err);

    return NextResponse.json(
      {
        error: "Failed to register",
        ...meta,
      },
      { status: 500 }
    );
  }
}
