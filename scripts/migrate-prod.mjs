import "dotenv/config";
import { execSync } from "child_process";

const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } = process.env;

if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env");
  process.exit(1);
}

// Apply pending migrations to Turso using the libsql client directly,
// since Prisma's schema engine doesn't support libsql:// URLs.
// This runs only the SQL for new migrations that haven't been applied yet.

const { createClient } = await import("@libsql/client");
const client = createClient({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN });

// Ensure the migrations tracking table exists in Turso
await client.execute(`
  CREATE TABLE IF NOT EXISTS _prisma_migrations (
    id TEXT PRIMARY KEY,
    checksum TEXT NOT NULL,
    finished_at DATETIME,
    migration_name TEXT NOT NULL,
    logs TEXT,
    rolled_back_at DATETIME,
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    applied_steps_count INTEGER NOT NULL DEFAULT 0
  )
`);

// Read applied migrations from Turso
const { rows } = await client.execute("SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL");
const applied = new Set(rows.map((r) => r.migration_name));

// Read local migration files
const { readdirSync, readFileSync } = await import("fs");
const { join, dirname } = await import("path");
const { fileURLToPath } = await import("url");

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "../prisma/migrations");
const folders = readdirSync(migrationsDir).filter((f) => !f.includes(".")).sort();

let ran = 0;
for (const folder of folders) {
  if (applied.has(folder)) continue;

  const sql = readFileSync(join(migrationsDir, folder, "migration.sql"), "utf8");
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`Applying: ${folder}`);
  for (const stmt of statements) {
    try {
      await client.execute(stmt);
    } catch (err) {
      // Ignore "already exists" / "no such table" errors from idempotent DDL
      if (!err.message.includes("already exists") && !err.message.includes("no such table")) {
        throw err;
      }
    }
  }

  await client.execute({
    sql: "INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count) VALUES (?, ?, datetime('now'), ?, ?)",
    args: [crypto.randomUUID(), folder, folder, 1],
  });

  ran++;
}

if (ran === 0) {
  console.log("No pending migrations.");
} else {
  console.log(`Done — applied ${ran} migration(s).`);
}
