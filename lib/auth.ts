/* eslint-disable @typescript-eslint/no-explicit-any */
import { cookies } from "next/headers";

export async function requireSession() {
  const store = await cookies();
  const session = store.get("afos_session")?.value;

  if (!session) {
    const err: any = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }

  // Keep it simple: cookie value is userId
  return { userId: session };
}
