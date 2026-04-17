#!/usr/bin/env tsx
/**
 * import-watch-dates.ts
 *
 * Scans every revision of a Google Sheets spreadsheet to find the earliest
 * revision in which each title appears — and uses that revision's timestamp
 * as the watchedDate. Approximate on purpose: if you added five movies in one
 * session they'll all share the same date.
 *
 * Prerequisites:
 *   1. credentials.json in the project root (see CLAUDE.md / setup docs)
 *   2. TMDB_API_KEY + DATABASE_URL in .env
 *
 * Usage:
 *   npx tsx scripts/import-watch-dates.ts <spreadsheet-id>
 *
 * First run opens a browser for Google OAuth. Saves token to
 * scripts/token.json (gitignored) for subsequent runs.
 */

import fs from "fs";
import path from "path";
import http from "http";
import readline from "readline";
import { google } from "googleapis";
import Fuse from "fuse.js";
import * as dotenv from "dotenv";

// ── Env ───────────────────────────────────────────────────────────────────────

dotenv.config({ path: path.join(__dirname, "..", ".env") });

// ── Paths ─────────────────────────────────────────────────────────────────────

const CREDENTIALS_PATH = path.join(__dirname, "..", "credentials.json");
const TOKEN_PATH = path.join(__dirname, "token.json");
const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];

// Throttle between revision downloads (ms). Drive API allows ~10 req/s.
const THROTTLE_MS = 120;

// ── Readline helper ───────────────────────────────────────────────────────────

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const ask = (q: string) =>
  new Promise<string>((resolve) => rl.question(q, resolve));

// ── Auth ──────────────────────────────────────────────────────────────────────

async function getAuthClient() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error(
      `\nError: credentials.json not found at project root.\n` +
        `Download it from Google Cloud Console → APIs & Services → Credentials.\n`
    );
    process.exit(1);
  }

  const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
  const { client_secret, client_id } = creds.installed;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    "http://localhost:3333/oauth2callback"
  );

  if (fs.existsSync(TOKEN_PATH)) {
    const saved = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
    oAuth2Client.setCredentials(saved);
    // Refresh if expired
    const { credentials } = await oAuth2Client.refreshAccessToken().catch(
      () => ({ credentials: saved })
    );
    oAuth2Client.setCredentials(credentials);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(credentials, null, 2));
    return oAuth2Client;
  }

  // First-time OAuth
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });

  const { exec } = await import("child_process");
  exec(`open "${authUrl}"`);
  console.log(
    `\nOpening browser for Google authorization.\n` +
      `If it didn't open, visit:\n${authUrl}\n`
  );

  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, "http://localhost:3333");
      const code = url.searchParams.get("code");
      if (code) {
        res.end("<h1>Authorized! You can close this tab.</h1>");
        server.close();
        resolve(code);
      } else {
        res.end("<h1>No code received — try again.</h1>");
        server.close();
        reject(new Error("No auth code"));
      }
    });
    server.listen(3333, () =>
      console.log("Waiting for OAuth callback on http://localhost:3333 ...\n")
    );
  });

  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log("Token saved to scripts/token.json\n");
  return oAuth2Client;
}

// ── Revision fetching ─────────────────────────────────────────────────────────

interface Revision {
  id: string;
  modifiedTime: string;
  exportLinks?: Record<string, string>;
}

async function getAllRevisions(
  auth: ReturnType<typeof google.auth.OAuth2.prototype.constructor> extends never ? never : Awaited<ReturnType<typeof getAuthClient>>,
  fileId: string
): Promise<Revision[]> {
  const drive = google.drive({ version: "v3", auth: auth as any });
  const all: Revision[] = [];
  let pageToken: string | undefined;

  process.stdout.write("Fetching revision list");

  do {
    const res = await drive.revisions.list({
      fileId,
      fields: "nextPageToken,revisions(id,modifiedTime,exportLinks)",
      pageSize: 1000,
      ...(pageToken ? { pageToken } : {}),
    });

    for (const r of res.data.revisions ?? []) {
      if (r.id && r.modifiedTime) {
        all.push({
          id: r.id,
          modifiedTime: r.modifiedTime,
          exportLinks: (r.exportLinks as Record<string, string>) ?? undefined,
        });
      }
    }
    pageToken = res.data.nextPageToken ?? undefined;
    process.stdout.write(".");
  } while (pageToken);

  console.log(` ${all.length} revisions found.`);

  // Oldest first
  all.sort(
    (a, b) =>
      new Date(a.modifiedTime).getTime() - new Date(b.modifiedTime).getTime()
  );

  const first = all[0]?.modifiedTime?.split("T")[0];
  const last = all[all.length - 1]?.modifiedTime?.split("T")[0];
  console.log(`  Range: ${first} → ${last}\n`);

  return all;
}

// ── CSV download ──────────────────────────────────────────────────────────────

async function fetchCsvForRevision(
  auth: Awaited<ReturnType<typeof getAuthClient>>,
  fileId: string,
  revision: Revision
): Promise<string | null> {
  // Prefer exportLinks if present (returned by the API)
  const exportUrl =
    revision.exportLinks?.["text/csv"] ??
    `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv&revision=${revision.id}`;

  try {
    const tokenRes = await (auth as any).getAccessToken();
    const token: string = tokenRes.token;

    const res = await fetch(exportUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// ── CSV parsing ───────────────────────────────────────────────────────────────

/** Handles basic quoted CSV fields. */
function parseCsvLine(line: string): string[] {
  const cols: string[] = [];
  let inQuotes = false;
  let cell = "";

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      cols.push(cell);
      cell = "";
    } else {
      cell += ch;
    }
  }
  cols.push(cell);
  return cols;
}

function extractTitlesFromCsv(csv: string, colIndex: number): Set<string> {
  const titles = new Set<string>();
  const lines = csv.split("\n");

  // Skip header row (index 0)
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const raw = cols[colIndex]?.trim() ?? "";
    const normalized = normalizeTitle(raw);
    if (normalized) titles.add(normalized);
  }

  return titles;
}

/** Strip leading/trailing ★ ☆ * markers and lowercase. */
function normalizeTitle(t: string): string {
  return t
    .replace(/^[★☆*\s]+|[★☆*\s]+$/g, "")
    .trim()
    .toLowerCase();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Prisma setup ──────────────────────────────────────────────────────────────

async function createPrisma() {
  // Dynamic imports so this file can run outside Next.js module resolution
  const { PrismaLibSql } = await import("@prisma/adapter-libsql");
  const { PrismaClient } = await import("../src/generated/prisma/client");

  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const adapter = new PrismaLibSql({ url });
  return new PrismaClient({ adapter } as ConstructorParameters<
    typeof PrismaClient
  >[0]);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== import-watch-dates ===\n");

  const args = process.argv.slice(2);
  const resetFlag = args.includes("--reset");
  const fileId = args.find((a) => !a.startsWith("--"));

  if (!fileId) {
    console.error(
      "Usage: npx tsx scripts/import-watch-dates.ts <spreadsheet-id> [--reset]\n\n" +
        "  --reset   Clear all existing watchedDate values before scanning.\n" +
        "            Use this when re-running after a previous bad import.\n\n" +
        "Find the spreadsheet ID in the sheet URL:\n" +
        "  https://docs.google.com/spreadsheets/d/<ID>/edit"
    );
    process.exit(1);
  }

  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const auth = await getAuthClient();

  // ── 2. Detect title column ───────────────────────────────────────────────
  console.log("Fetching latest sheet to detect columns...");

  // "head" isn't a real revision ID, so we use a direct export of the live sheet
  const previewUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`;
  const tokenRes = await (auth as any).getAccessToken();
  const previewRes = await fetch(previewUrl, {
    headers: { Authorization: `Bearer ${tokenRes.token}` },
  });

  let titleColIndex = 0;

  if (previewRes.ok) {
    const previewCsv = await previewRes.text();
    const firstLine = previewCsv.split("\n")[0];
    const headers = parseCsvLine(firstLine);

    console.log("\nColumns detected:");
    headers.forEach((h, i) => console.log(`  [${i}] ${h || "(empty)"}`));

    const input = await ask(
      "\nWhich column number contains movie/show titles? (default: 0) "
    );
    titleColIndex = parseInt(input, 10);
    if (isNaN(titleColIndex)) titleColIndex = 0;
    console.log(`Using column ${titleColIndex}.\n`);
  } else {
    console.warn(
      "Could not fetch sheet preview. Defaulting to column 0. Use --col=N to override.\n"
    );
  }

  // ── 3. Fetch all revisions ───────────────────────────────────────────────
  const revisions = await getAllRevisions(auth, fileId);

  // ── 4. Build title → first-seen date map ────────────────────────────────
  console.log(
    `Downloading ${revisions.length} revisions to find first appearances...\n` +
      `(~${Math.ceil((revisions.length * THROTTLE_MS) / 60000)} min at ${THROTTLE_MS}ms/req)\n`
  );

  const titleFirstSeen = new Map<string, Date>();
  let downloaded = 0;
  let failed = 0;

  for (const rev of revisions) {
    const csv = await fetchCsvForRevision(auth, fileId, rev);

    if (csv) {
      const titles = extractTitlesFromCsv(csv, titleColIndex);
      const date = new Date(rev.modifiedTime);

      for (const title of titles) {
        if (!titleFirstSeen.has(title)) {
          titleFirstSeen.set(title, date);
        }
      }
      downloaded++;
    } else {
      failed++;
    }

    const done = downloaded + failed;
    if (done % 20 === 0 || done === revisions.length) {
      process.stdout.write(
        `  ${done}/${revisions.length} (${downloaded} ok, ${failed} skipped)\r`
      );
    }

    await sleep(THROTTLE_MS);
  }

  console.log(
    `\n\nDone scanning. ${titleFirstSeen.size} unique titles found across sheet history.\n`
  );

  // ── 5. Load DB movies ────────────────────────────────────────────────────
  const prisma = await createPrisma();

  if (resetFlag) {
    const { count } = await prisma.movie.updateMany({
      data: { watchedDate: null },
    });
    console.log(`--reset: cleared watchedDate on ${count} movies.\n`);
  }

  const movies = await prisma.movie.findMany({
    select: { id: true, title: true, watchedDate: true },
  });
  console.log(`Loaded ${movies.length} movies from database.\n`);

  // ── 6. Match titles ──────────────────────────────────────────────────────
  const sheetTitles = Array.from(titleFirstSeen.keys());
  const fuse = new Fuse(sheetTitles, {
    threshold: 0.25,
    includeScore: true,
  });

  const exactMatches: {
    id: number;
    title: string;
    sheetTitle: string;
    date: Date;
  }[] = [];
  const fuzzyMatches: {
    id: number;
    title: string;
    sheetTitle: string;
    date: Date;
    confidence: number;
  }[] = [];
  const noMatch: string[] = [];

  for (const movie of movies) {
    if (!resetFlag && movie.watchedDate) continue; // already has a date (skip unless --reset)

    const norm = normalizeTitle(movie.title);

    if (titleFirstSeen.has(norm)) {
      exactMatches.push({
        id: movie.id,
        title: movie.title,
        sheetTitle: norm,
        date: titleFirstSeen.get(norm)!,
      });
      continue;
    }

    const results = fuse.search(norm);
    if (results.length > 0 && results[0].score! <= 0.25) {
      fuzzyMatches.push({
        id: movie.id,
        title: movie.title,
        sheetTitle: results[0].item,
        date: titleFirstSeen.get(results[0].item)!,
        confidence: Math.round((1 - results[0].score!) * 100),
      });
    } else {
      noMatch.push(movie.title);
    }
  }

  const alreadySet = movies.filter((m) => m.watchedDate).length;

  // ── 7. Preview results ───────────────────────────────────────────────────
  console.log("── Match Summary ─────────────────────────────────────────────");
  console.log(`  Already had a date : ${alreadySet}`);
  console.log(`  Exact matches      : ${exactMatches.length}`);
  console.log(`  Fuzzy matches      : ${fuzzyMatches.length}`);
  console.log(`  No match           : ${noMatch.length}`);
  console.log("");

  if (fuzzyMatches.length > 0) {
    console.log("Fuzzy matches (review before confirming):");
    fuzzyMatches.slice(0, 30).forEach((m) => {
      const dateStr = m.date.toISOString().split("T")[0];
      console.log(
        `  "${m.title}" → "${m.sheetTitle}" (${m.confidence}% confidence) → ${dateStr}`
      );
    });
    if (fuzzyMatches.length > 30)
      console.log(`  ... and ${fuzzyMatches.length - 30} more`);
    console.log("");
  }

  if (noMatch.length > 0) {
    console.log(`Titles with no sheet match (${noMatch.length}):`);
    noMatch.slice(0, 20).forEach((t) => console.log(`  - ${t}`));
    if (noMatch.length > 20)
      console.log(`  ... and ${noMatch.length - 20} more`);
    console.log("");
  }

  const totalToWrite = exactMatches.length + fuzzyMatches.length;
  if (totalToWrite === 0) {
    console.log("Nothing to write. Exiting.");
    await prisma.$disconnect();
    rl.close();
    return;
  }

  const confirm = await ask(
    `Write ${totalToWrite} watch dates to database? (yes/no): `
  );
  rl.close();

  if (confirm.trim().toLowerCase() !== "yes") {
    console.log("Aborted. No changes made.");
    await prisma.$disconnect();
    process.exit(0);
  }

  // ── 8. Write to DB ───────────────────────────────────────────────────────
  console.log("\nWriting to database...");
  let written = 0;

  for (const m of [...exactMatches, ...fuzzyMatches]) {
    await prisma.movie.update({
      where: { id: m.id },
      data: { watchedDate: m.date },
    });
    written++;
  }

  await prisma.$disconnect();

  console.log(`\nDone! ${written} movies updated with watch dates.`);
  if (noMatch.length > 0) {
    console.log(
      `${noMatch.length} movies had no sheet match — set their dates manually in the app.`
    );
  }
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
