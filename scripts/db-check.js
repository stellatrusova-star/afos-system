const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("DATABASE_URL:", process.env.DATABASE_URL);
  const r = await prisma.$queryRaw`select current_database() as db, current_user as usr`;
  console.log(r);
}
main().finally(() => prisma.$disconnect());
