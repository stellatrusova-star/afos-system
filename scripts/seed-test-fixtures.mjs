import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const YEAR = 2026;
const CLOSED_MONTH = 3;
const OPEN_MONTH = 4;

console.log("DATABASE_URL_PRESENT:", !!process.env.DATABASE_URL);
const email = process.env.SEED_ADMIN_EMAIL || "stella.trusova@gmail.com";
console.log("SEED_ADMIN_EMAIL:", email);
const password = process.env.SEED_ADMIN_PASSWORD || "stella.trusova@gmail.com";
const hash = await bcrypt.hash(password, 10);

// 1) Admin user
await prisma.user.upsert({
  where: { email },
  update: { password: hash, role: "ADMIN" },
  create: { email, password: hash, role: "ADMIN" },
});

// 2) Ensure at least one client exists
const existingClient = await prisma.client.findFirst();
if (!existingClient) {
  await prisma.client.create({
    data: {
      name: "Test Client",
      email: "test-client@example.com",
      monthlyFee: 1000,
    },
  });
}

// 3) Ensure closed + open billing periods exist in expected states
await prisma.billingPeriod.upsert({
  where: { year_month: { year: YEAR, month: CLOSED_MONTH } },
  update: { isClosed: true, closedAt: new Date(), closedById: null },
  create: { year: YEAR, month: CLOSED_MONTH, isClosed: true, closedAt: new Date(), closedById: null },
});

await prisma.billingPeriod.upsert({
  where: { year_month: { year: YEAR, month: OPEN_MONTH } },
  update: { isClosed: false, closedAt: null, closedById: null },
  create: { year: YEAR, month: OPEN_MONTH, isClosed: false, closedAt: null, closedById: null },
});

console.log("✅ Seeded test fixtures: admin user, 1 client, closed/open billing periods");
await prisma.$disconnect();
