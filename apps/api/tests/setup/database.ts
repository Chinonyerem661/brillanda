import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

/** Runs once before all test files: bring brillanda_test up to the latest migration, then empty it. */
export default async function prepareTestDatabase() {
  config();
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !new URL(url).pathname.endsWith("_test")) {
    throw new Error(`Refusing to prepare a database whose name doesn't end in "_test": ${url}`);
  }

  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });

  const prisma = new PrismaClient({ datasourceUrl: url });
  try {
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
    // TRUNCATE doesn't fire row-level triggers, so this also empties the append-only AuditLog.
    await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
  } finally {
    await prisma.$disconnect();
  }
}
