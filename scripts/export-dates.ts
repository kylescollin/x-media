#!/usr/bin/env tsx
/**
 * export-dates.ts
 *
 * Binary-searches Google Sheets revision history to find when each movie first
 * appeared. Writes movies_with_dates.csv in the project root — no DB writes.
 *
 * Key improvements over import-watch-dates.ts:
 *  - Binary search (with shared cache) instead of linear full scan
 *  - Row-position matching with title-verification fallback for reordered rows
 *  - Explicit "estimated" confidence flag for pre-history entries
 *  - Exponential backoff on failed revision downloads
 *
 * Usage:
 *   npx tsx scripts/export-dates.ts <spreadsheet-id>
 *   npm run export:dates -- <spreadsheet-id>
 */

import fs from "fs";
import path from "path";
import http from "http";
import { google } from "googleapis";
import Fuse from "fuse.js";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

// ── Constants ─────────────────────────────────────────────────────────────────

const CREDENTIALS_PATH = path.join(__dirname, "..", "credentials.json");
const TOKEN_PATH = path.join(__dirname, "token.json");
const OUTPUT_PATH = path.join(__dirname, "..", "movies_with_dates.csv");
const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];
const THROTTLE_MS = 150; // ms between real network requests

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
    const { credentials } = await oAuth2Client
      .refreshAccessToken()
      .catch(() => ({ credentials: saved }));
    oAuth2Client.setCredentials(credentials);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(credentials, null, 2));
    return oAuth2Client;
  }

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

// ── Revision list ─────────────────────────────────────────────────────────────

interface Revision {
  id: string;
  modifiedTime: string;
  exportLinks?: Record<string, string>;
}

async function getAllRevisions(
  auth: Awaited<ReturnType<typeof getAuthClient>>,
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

  all.sort(
    (a, b) =>
      new Date(a.modifiedTime).getTime() - new Date(b.modifiedTime).getTime()
  );

  const first = all[0]?.modifiedTime.split("T")[0];
  const last = all[all.length - 1]?.modifiedTime.split("T")[0];
  console.log(` ${all.length} revisions found.\n  Range: ${first} → ${last}\n`);

  return all;
}

// ── CSV fetching with backoff ─────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchCsvWithBackoff(
  auth: Awaited<ReturnType<typeof getAuthClient>>,
  fileId: string,
  revision: Revision
): Promise<string | null> {
  // Prefer exportLinks if present; fall back to direct export URL
  const url =
    revision.exportLinks?.["text/csv"] ??
    `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv&revision=${revision.id}`;

  const delays = [2000, 4000, 8000];

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      const tokenRes = await (auth as any).getAccessToken();
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${tokenRes.token}` },
      });

      if (res.ok) return await res.text();

      // Retry on rate-limit or server errors only
      if ((res.status === 429 || res.status >= 500) && attempt < delays.length) {
        await sleep(delays[attempt]);
        continue;
      }

      return null;
    } catch {
      if (attempt < delays.length) await sleep(delays[attempt]);
    }
  }

  return null;
}

// ── CSV parsing ───────────────────────────────────────────────────────────────

interface SheetRow {
  /** 1-based line index in the source CSV (0 = header, skipped) */
  lineIndex: number;
  title: string;
  isFavorite: boolean;
}

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

/** Strips ★ ☆ * markers and lowercases for comparison. */
function normalizeTitle(t: string): string {
  return t
    .replace(/^[★☆*\s]+|[★☆*\s]+$/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Returns all data rows (skips header at line 0).
 * lineIndex is 1-based so it can be used as a stable row address across revisions.
 */
function parseSheetRows(csv: string): SheetRow[] {
  const lines = csv.split("\n");
  const rows: SheetRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const colA = cols[0]?.trim() ?? "";
    const colB = cols[1]?.trim() ?? "";
    rows.push({
      lineIndex: i,
      title: colB,
      isFavorite: /[★☆*]/.test(colA),
    });
  }

  return rows;
}

// ── Revision cache ─────────────────────────────────────────────────────────────

let lastRequestTime = 0;

/**
 * Downloads and caches a revision's parsed rows.
 * Cache stores null for permanently failed downloads so we don't retry.
 */
async function getRevisionRows(
  auth: Awaited<ReturnType<typeof getAuthClient>>,
  fileId: string,
  revision: Revision,
  cache: Map<string, SheetRow[] | null>
): Promise<SheetRow[] | null> {
  if (cache.has(revision.id)) {
    return cache.get(revision.id)!;
  }

  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < THROTTLE_MS) await sleep(THROTTLE_MS - elapsed);
  lastRequestTime = Date.now();

  const csv = await fetchCsvWithBackoff(auth, fileId, revision);

  if (!csv) {
    process.stdout.write(
      `\n  [WARN] Could not download revision ${revision.id} (${revision.modifiedTime.split("T")[0]}) — skipping in binary search\n`
    );
    cache.set(revision.id, null);
    return null;
  }

  const rows = parseSheetRows(csv);
  cache.set(revision.id, rows);
  return rows;
}

// ── Title similarity ──────────────────────────────────────────────────────────

/**
 * Returns true if two titles are similar enough to be considered the same movie.
 * Used to detect when a row position holds a completely different title (reorder).
 */
function titlesMatch(a: string, b: string): boolean {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const fuse = new Fuse([nb], { threshold: 1.0, includeScore: true });
  const result = fuse.search(na);
  // Score < 0.5 means >50% similarity — treat as the same title
  return result.length > 0 && result[0].score! < 0.5;
}

// ── Binary search ─────────────────────────────────────────────────────────────

interface SearchResult {
  title: string;
  isFavorite: boolean;
  dateAdded: string;
  confidence: "exact" | "estimated" | "not-found";
  notes: string;
}

/**
 * Title-string fallback: binary searches for when any row in the revision
 * contains the normalized title. Used when row-position check finds a mismatch.
 * Returns YYYY-MM-DD of first appearance, or null if not found.
 */
async function findFirstRevisionByTitle(
  auth: Awaited<ReturnType<typeof getAuthClient>>,
  fileId: string,
  normTitle: string,
  revisions: Revision[],
  cache: Map<string, SheetRow[] | null>
): Promise<{ date: string; preHistory: boolean } | null> {
  if (!normTitle) return null;

  const hasTitle = (rows: SheetRow[] | null) =>
    rows?.some((r) => normalizeTitle(r.title) === normTitle) ?? false;

  const oldestRows = await getRevisionRows(auth, fileId, revisions[0], cache);
  if (hasTitle(oldestRows)) {
    return { date: revisions[0].modifiedTime.split("T")[0], preHistory: true };
  }

  const newestRows = await getRevisionRows(
    auth,
    fileId,
    revisions[revisions.length - 1],
    cache
  );
  if (!hasTitle(newestRows)) return null;

  let lo = 1;
  let hi = revisions.length - 1;

  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const midRows = await getRevisionRows(auth, fileId, revisions[mid], cache);

    if (!midRows) {
      lo = mid + 1;
      continue;
    }

    if (hasTitle(midRows)) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }

  return { date: revisions[hi].modifiedTime.split("T")[0], preHistory: false };
}

/**
 * Finds the earliest revision where currentRow's line position has a non-empty
 * title. Falls back to title-string search if the found row's title differs
 * significantly (reorder detected).
 */
async function findFirstRevision(
  auth: Awaited<ReturnType<typeof getAuthClient>>,
  fileId: string,
  currentRow: SheetRow,
  revisions: Revision[],
  cache: Map<string, SheetRow[] | null>
): Promise<SearchResult> {
  const base = { title: currentRow.title, isFavorite: currentRow.isFavorite };

  if (revisions.length === 0) {
    return { ...base, dateAdded: "", confidence: "not-found", notes: "No revisions available" };
  }

  const dataIndex = currentRow.lineIndex - 1; // SheetRow[] is 0-indexed by data position

  // ── Step 1: Check oldest revision ─────────────────────────────────────────
  const oldestDate = revisions[0].modifiedTime.split("T")[0];
  const oldestRows = await getRevisionRows(auth, fileId, revisions[0], cache);
  if (oldestRows && oldestRows[dataIndex]?.title.trim()) {
    return {
      ...base,
      dateAdded: oldestDate,
      confidence: "estimated",
      notes: `present in oldest available revision (${oldestDate}); actual add date unknown`,
    };
  }

  // ── Step 2: Confirm presence in newest revision ────────────────────────────
  const newestRev = revisions[revisions.length - 1];
  const newestRows = await getRevisionRows(auth, fileId, newestRev, cache);
  const inNewest = !!(newestRows && newestRows[dataIndex]?.title.trim());

  if (!inNewest) {
    // Row index beyond newest revision — could be a recent addition
    const newestDate = newestRev.modifiedTime.split("T")[0];
    return {
      ...base,
      dateAdded: newestDate,
      confidence: "exact",
      notes: "row position absent in newest revision; using most recent revision date",
    };
  }

  // ── Step 3: Binary search for first appearance (absent → present) ──────────
  let lo = 1;
  let hi = revisions.length - 1;

  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const midRows = await getRevisionRows(auth, fileId, revisions[mid], cache);

    if (!midRows) {
      // Failed download — treat as absent to search the later half
      lo = mid + 1;
      continue;
    }

    const presentAtMid = !!(midRows[dataIndex]?.title.trim());

    if (presentAtMid) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }

  const firstRev = revisions[hi];
  const firstRevDate = firstRev.modifiedTime.split("T")[0];
  const firstRows = await getRevisionRows(auth, fileId, firstRev, cache);
  const titleAtRow = firstRows?.[dataIndex]?.title ?? "";

  // ── Step 4: Title verification (reorder detection) ─────────────────────────
  if (titleAtRow && !titlesMatch(titleAtRow, currentRow.title)) {
    const norm = normalizeTitle(currentRow.title);
    const fallback = await findFirstRevisionByTitle(
      auth,
      fileId,
      norm,
      revisions,
      cache
    );

    if (fallback) {
      return {
        ...base,
        dateAdded: fallback.date,
        confidence: fallback.preHistory ? "estimated" : "exact",
        notes:
          `reorder detected (row ${currentRow.lineIndex} had "${titleAtRow.trim()}"); ` +
          `date from title-string fallback` +
          (fallback.preHistory ? "; present in oldest revision" : ""),
      };
    }

    return {
      ...base,
      dateAdded: firstRevDate,
      confidence: "estimated",
      notes:
        `reorder detected (row ${currentRow.lineIndex} had "${titleAtRow.trim()}"); ` +
        `title-string fallback also failed; date may be wrong`,
    };
  }

  return { ...base, dateAdded: firstRevDate, confidence: "exact", notes: "" };
}

// ── CSV writing ───────────────────────────────────────────────────────────────

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function writeResultsCsv(results: SearchResult[], outputPath: string) {
  const header = "title,is_favorite,date_added,confidence,notes";
  const rows = results.map((r) =>
    [
      escapeCsv(r.title),
      r.isFavorite ? "true" : "false",
      r.dateAdded,
      r.confidence,
      escapeCsv(r.notes),
    ].join(",")
  );
  fs.writeFileSync(outputPath, [header, ...rows].join("\n") + "\n", "utf8");
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== export-dates ===\n");

  const fileId = process.argv[2];
  if (!fileId) {
    console.error(
      "Usage: npx tsx scripts/export-dates.ts <spreadsheet-id>\n\n" +
        "Find the spreadsheet ID in the Google Sheets URL:\n" +
        "  https://docs.google.com/spreadsheets/d/<ID>/edit\n"
    );
    process.exit(1);
  }

  const auth = await getAuthClient();

  // ── 1. Fetch current sheet (Movies = first tab) ───────────────────────────
  console.log("Fetching current sheet (Movies tab = first tab)...");
  const tokenRes = await (auth as any).getAccessToken();
  const sheetRes = await fetch(
    `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`,
    { headers: { Authorization: `Bearer ${tokenRes.token}` } }
  );

  if (!sheetRes.ok) {
    console.error(`Failed to fetch current sheet: HTTP ${sheetRes.status}`);
    process.exit(1);
  }

  const currentCsv = await sheetRes.text();
  const allCurrentRows = parseSheetRows(currentCsv);
  const currentRows = allCurrentRows.filter((r) => r.title.trim());
  console.log(`${currentRows.length} non-empty rows in Movies tab.\n`);

  // ── 2. Fetch all revision metadata ────────────────────────────────────────
  const revisions = await getAllRevisions(auth, fileId);

  if (revisions.length === 0) {
    console.error("No revisions returned. Check Drive API permissions.");
    process.exit(1);
  }

  // ── 3. Binary search per row ──────────────────────────────────────────────
  console.log(
    `Searching ${currentRows.length} rows across ${revisions.length} revisions...\n` +
      `Each unique revision download is throttled to ${THROTTLE_MS}ms.\n`
  );

  const cache = new Map<string, SheetRow[] | null>();
  const results: SearchResult[] = [];
  let exact = 0;
  let estimated = 0;
  let notFound = 0;
  let reorders = 0;

  for (let i = 0; i < currentRows.length; i++) {
    const row = currentRows[i];
    const result = await findFirstRevision(auth, fileId, row, revisions, cache);
    results.push(result);

    if (result.confidence === "exact") exact++;
    else if (result.confidence === "estimated") estimated++;
    else notFound++;
    if (result.notes.includes("reorder")) reorders++;

    if ((i + 1) % 10 === 0 || i === currentRows.length - 1) {
      // Count unique downloads (exclude null cache entries for the display)
      const downloads = [...cache.values()].filter((v) => v !== null).length;
      process.stdout.write(
        `  Row ${i + 1}/${currentRows.length} | Revisions downloaded: ${downloads}/${revisions.length}   \r`
      );
    }
  }

  console.log("\n");

  // ── 4. Write CSV ──────────────────────────────────────────────────────────
  writeResultsCsv(results, OUTPUT_PATH);
  console.log(`CSV written → ${OUTPUT_PATH}\n`);

  // ── 5. Summary ────────────────────────────────────────────────────────────
  const downloads = [...cache.values()].filter((v) => v !== null).length;
  const failed = [...cache.values()].filter((v) => v === null).length;

  console.log("── Summary ───────────────────────────────────────────────────");
  console.log(`  Rows processed       : ${results.length}`);
  console.log(`  Exact dates          : ${exact}`);
  console.log(`  Estimated (pre-hist) : ${estimated}`);
  console.log(`  Not found            : ${notFound}`);
  console.log(`  Reorder flags        : ${reorders}`);
  console.log(`  Revisions downloaded : ${downloads} (${failed} failed) of ${revisions.length}`);
  console.log("");

  if (estimated > 0) {
    const oldestDate = revisions[0].modifiedTime.split("T")[0];
    console.log(
      `⚠  WARNING: ${estimated} movies were already present in the oldest available\n` +
        `   revision (${oldestDate}). Their date_added is a lower bound — the actual\n` +
        `   add date is unknown (Google Drive doesn't expose revisions before this).\n` +
        `   These rows have confidence=estimated in the CSV.\n`
    );

    const estimatedList = results.filter((r) => r.confidence === "estimated");
    console.log(`Estimated entries (${estimatedList.length}):`);
    estimatedList.slice(0, 40).forEach((r) => console.log(`  - ${r.title}`));
    if (estimatedList.length > 40) {
      console.log(`  ... and ${estimatedList.length - 40} more (see CSV)`);
    }
    console.log("");
  }

  if (reorders > 0) {
    console.log(
      `ℹ  ${reorders} rows had a reorder flag — check the notes column in the CSV.\n`
    );
  }
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
