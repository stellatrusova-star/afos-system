import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { year, month } = await req.json();

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/reminders/send?year=${year}&month=${month}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.REMINDERS_SECRET}`,
        },
      }
    );

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to trigger reminders" }, { status: 500 });
  }
}
