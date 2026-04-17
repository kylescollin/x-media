#!/usr/bin/env tsx
/**
 * clear-placeholder-dates.ts
 *
 * Clears watchedDate on any movie stamped with the Drive API's oldest
 * accessible revision date (2019-11-12) — these are placeholder dates,
 * not real watch dates.
 *
 * Usage:
 *   npx tsx scripts/clear-placeholder-dates.ts
 */

import path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function main() {
  const { PrismaLibSql } = await import("@prisma/adapter-libsql");
  const { PrismaClient } = await import("../src/generated/prisma/client");

  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const adapter = new PrismaLibSql({ url });
  const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

  // Find movies stamped on exactly 2019-11-12 (any time that day UTC)
  const start = new Date("2019-11-12T00:00:00.000Z");
  const end   = new Date("2019-11-13T00:00:00.000Z");

  const preview = await prisma.movie.findMany({
    where: { watchedDate: { gte: start, lt: end } },
    select: { id: true, title: true, watchedDate: true },
  });

  if (preview.length === 0) {
    console.log("No movies found with a 2019-11-12 placeholder date. Nothing to do.");
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${preview.length} movies with placeholder date 2019-11-12:`);
  preview.slice(0, 10).forEach((m) => console.log(`  - ${m.title}`));
  if (preview.length > 10) console.log(`  ... and ${preview.length - 10} more`);

  const { count } = await prisma.movie.updateMany({
    where: { watchedDate: { gte: start, lt: end } },
    data: { watchedDate: null },
  });

  await prisma.$disconnect();
  console.log(`\nCleared watchedDate on ${count} movies.`);
}

main().catch(console.error);
