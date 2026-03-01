import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";

/**
 * Simple role gate for API routes.
 * - If user missing => 401
 * - If role not allowed => 403
 */
export function requireRole(user: { id: string; role: Role } | null, allowed: Role[]) {
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!allowed.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
