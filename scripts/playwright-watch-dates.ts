#!/usr/bin/env tsx
/**
 * playwright-watch-dates.ts
 *
 * Extracts watch dates from Google Sheets version history.
 *
 * How content is read:
 *   When you click a revision tile, Chrome fetches that version's sheet data
 *   from Google's servers. We intercept those network responses and check
 *   whether each known movie title appears in the response body.
 *   No clipboard tricks, no DOM parsing of canvas cells.
 *
 * Usage:
 *   npx tsx scripts/playwright-watch-dates.ts <spreadsheet-id> [--col=1] [--dry-run] [--debug]
 *
 *   --col=N     Column index for titles (default: 1 = column B)
 *   --dry-run   Show matches without writing to DB
 *   --debug     Log response URLs captured per tile (helps diagnose no-data issues)
 *
 * Before running, start Chrome with remote debugging:
 *   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
 *     --remote-debugging-port=9222 \
 *     --user-data-dir="$(pwd)/scripts/.browser-session" 2>/dev/null &
 * Navigate to your spreadsheet in that window.
 */

import path from "path";
import readline from "readline";
import { chromium } from "playwright";
import type { Page, Response } from "playwright";
import Fuse from "fuse.js";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

// ── Selectors (from DOM inspection) ──────────────────────────────────────────
const SEL_LIST     = "div.appsDocsRevisionsWizSidebarRevisionsTilesList";
const SEL_TILE     = "div.appsDocsRevisionsWizSidebarRevisionTile";
const SEL_HEADER   = "div.DocsSidebarComponentsTileHeader";
const SEL_TITLEBAR = "h4.docs-revisions-chromecover-titlebar-name-label";
const SEL_IFRAME   = "iframe.waffle-revisions-frame";

// ── Config ────────────────────────────────────────────────────────────────────
const VERSION_LOAD_TIMEOUT_MS = 15_000;
const INTER_CLICK_PAUSE_MS    = 400;
/** Titles shorter than this are skipped when scanning response bodies (avoids false positives). */
const MIN_TITLE_LENGTH = 5;

// ── Helpers ───────────────────────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string) => new Promise<string>((r) => rl.question(q, r));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function normalizeTitle(t: string): string {
  return t.replace(/^[★☆*\s]+|[★☆*\s]+$/g, "").trim().toLowerCase();
}

// ── Date parsing ──────────────────────────────────────────────────────────────
function parseVersionDate(text: string): Date | null {
  if (!text?.trim()) return null;
  const t = text.trim();
  const now = new Date();

  if (/today/i.test(t)) return new Date(now.toDateString());
  if (/yesterday/i.test(t)) {
    const d = new Date(now); d.setDate(d.getDate() - 1); return new Date(d.toDateString());
  }
  // "Month DD, YYYY, H:MM AM/PM" or "Month DD, YYYY"
  const withYear = t.match(/^(\w+ \d{1,2}),\s*(\d{4})/);
  if (withYear) {
    const d = new Date(`${withYear[1]}, ${withYear[2]}`);
    if (!isNaN(d.getTime())) return d;
  }
  // "Month DD, H:MM AM/PM" — no year, use current year
  const noYear = t.match(/^(\w+ \d{1,2}),\s*\d{1,2}:\d{2}/);
  if (noYear) {
    const d = new Date(`${noYear[1]}, ${now.getFullYear()}`);
    if (!isNaN(d.getTime())) return d;
  }
  // "Month YYYY" (sidebar header)
  const monthYear = t.match(/^(\w+)\s+(\d{4})$/);
  if (monthYear) {
    const d = new Date(`${monthYear[1]} 1, ${monthYear[2]}`);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

// ── Prisma ────────────────────────────────────────────────────────────────────
async function createPrisma() {
  const { PrismaLibSql } = await import("@prisma/adapter-libsql");
  const { PrismaClient } = await import("../src/generated/prisma/client");
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const adapter = new PrismaLibSql({ url });
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
}

// ── Titlebar helpers ──────────────────────────────────────────────────────────
async function getTitlebarText(page: Page): Promise<string> {
  try {
    const el = page.locator(SEL_TITLEBAR).first();
    if (await el.count() === 0) return "";
    return (await el.innerText()).trim();
  } catch { return ""; }
}

async function waitForVersionLoad(page: Page, prevText: string): Promise<string | null> {
  const deadline = Date.now() + VERSION_LOAD_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const current = await getTitlebarText(page);
    if (current && current !== prevText) return current;
    await sleep(300);
  }
  return null;
}

// ── Network-based title extraction ────────────────────────────────────────────

type ResponseCapture = { url: string; body: string };

/**
 * Given captured network response bodies, find which known DB titles appear.
 * We search for each title as a substring of the combined response text.
 * Titles shorter than MIN_TITLE_LENGTH are skipped to avoid false positives.
 */
function findTitlesInResponses(
  captures: ResponseCapture[],
  knownTitles: Map<string, unknown>
): string[] {
  if (captures.length === 0) return [];

  // Combine all response bodies for search
  const combined = captures.map((c) => c.body).join("\n").toLowerCase();
  const found: string[] = [];

  for (const [normTitle] of knownTitles) {
    if (normTitle.length < MIN_TITLE_LENGTH) continue;
    if (combined.includes(normTitle)) {
      found.push(normTitle);
    }
  }

  return found;
}

// ── Accessibility snapshot fallback ──────────────────────────────────────────
async function readTitlesViaAccessibility(page: Page): Promise<string[]> {
  try {
    const iframeEl = page.locator(SEL_IFRAME).first();
    if (await iframeEl.count() === 0) return [];

    const handle = await iframeEl.elementHandle();
    if (!handle) return [];

    const snapshot = await page.accessibility.snapshot({ root: handle });
    if (!snapshot) return [];

    const texts: string[] = [];
    function walk(node: { role?: string; name?: string; children?: typeof node[] }): void {
      if (node.name && node.name.length > 1 && node.name.length < 200) {
        if (node.role === "gridcell" || node.role === "cell" || node.role === "row") {
          texts.push(node.name);
        }
      }
      node.children?.forEach(walk);
    }
    walk(snapshot);
    return texts;
  } catch { return []; }
}

// ── Sidebar scrolling ─────────────────────────────────────────────────────────
async function scrollSidebar(page: Page, delta: number): Promise<void> {
  await page.evaluate(({ sel, d }: { sel: string; d: number }) => {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (el) el.scrollTop += d;
  }, { sel: SEL_LIST, d: delta });
}

async function scrollSidebarToBottom(page: Page): Promise<void> {
  let lastCount = -1, stable = 0;
  for (let i = 0; i < 500; i++) {
    await scrollSidebar(page, 400);
    await sleep(250);
    const count = await page.locator(SEL_TILE).count();
    if (count === lastCount) {
      stable++;
      // Wait up to ~8 seconds of no-new-tiles before giving up.
      // Google's servers need a few seconds to respond when fetching
      // older historical entries (especially around the pre-2019 range).
      if (stable >= 40) break;
    } else {
      stable = 0; lastCount = count;
      process.stdout.write(`  Loading sidebar: ${count} tiles...\r`);
    }
  }
}

async function isAtTop(page: Page): Promise<boolean> {
  return page.evaluate((sel: string) => {
    const el = document.querySelector(sel) as HTMLElement | null;
    return !el || el.scrollTop <= 10;
  }, SEL_LIST);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("=== playwright-watch-dates ===\n");

  const args = process.argv.slice(2);
  const dryRun  = args.includes("--dry-run");
  const debug   = args.includes("--debug");
  const colArg  = args.find((a) => a.startsWith("--col="));
  const titleColIndex = colArg ? parseInt(colArg.replace("--col=", ""), 10) : 1;
  const fileId  = args.find((a) => !a.startsWith("--"));

  if (!fileId) {
    console.error(
      "Usage: npx tsx scripts/playwright-watch-dates.ts <spreadsheet-id> [--col=1] [--dry-run] [--debug]\n"
    );
    process.exit(1);
  }
  console.log(`Column: ${titleColIndex} (${String.fromCharCode(65 + titleColIndex)})`);
  if (dryRun) console.log("DRY RUN — no DB writes.\n");
  if (debug)  console.log("DEBUG MODE — will log captured response URLs.\n");

  // ── Load DB titles for matching ────────────────────────────────────────────
  console.log("Loading movie titles from DB...");
  const prisma = await createPrisma();
  const movies = await prisma.movie.findMany({ select: { id: true, title: true, watchedDate: true } });
  const dbTitleMap = new Map<string, typeof movies[0]>();
  for (const m of movies) dbTitleMap.set(normalizeTitle(m.title), m);
  console.log(`Loaded ${dbTitleMap.size} titles. (${dbTitleMap.size - [...dbTitleMap.keys()].filter(t => t.length >= MIN_TITLE_LENGTH).length} short titles will be skipped in search)\n`);

  // ── Connect to Chrome ──────────────────────────────────────────────────────
  console.log(
    "Waiting for you to be ready...\n\n" +
    "Make sure Chrome is running with:\n" +
    '  /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome \\\n' +
    '    --remote-debugging-port=9222 \\\n' +
    '    --user-data-dir="$(pwd)/scripts/.browser-session" 2>/dev/null &\n\n' +
    "Navigate to your spreadsheet, then press Enter..."
  );
  await ask("");

  let browser: Awaited<ReturnType<typeof chromium.connectOverCDP>>;
  try {
    browser = await chromium.connectOverCDP("http://localhost:9222");
  } catch {
    console.error("Could not connect to Chrome on port 9222.");
    rl.close(); process.exit(1);
  }

  const context = browser.contexts()[0];
  if (!context) { console.error("No browser contexts."); rl.close(); process.exit(1); }

  const page =
    context.pages().find((p) => p.url().includes("docs.google.com/spreadsheets")) ??
    context.pages()[0];

  if (!page.url().includes("docs.google.com/spreadsheets")) {
    await page.goto(`https://docs.google.com/spreadsheets/d/${fileId}/edit`, { waitUntil: "domcontentloaded" });
    await sleep(3000);
  }
  console.log("\nSpreadsheet open.\n");

  // ── Open version history ───────────────────────────────────────────────────
  console.log("Opening version history...");
  try {
    await page.locator('[aria-label="File"], #docs-file-menu').first().click();
    await sleep(700);
    await page.locator('li:has-text("Version history"), div:has-text("Version history")').first().hover();
    await sleep(500);
    await page.locator('li:has-text("See version history"), div:has-text("See version history")').first().click();
    await sleep(4000);
  } catch {
    console.log("File menu failed — trying keyboard shortcut...");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Meta+Alt+Shift+KeyH");
    await sleep(4000);
  }

  if (await page.locator(SEL_LIST).count() === 0) {
    console.log("Sidebar not visible — open version history manually, then press Enter...");
    await ask("");
  }
  console.log("Version history sidebar open.\n");

  // ── Scroll to bottom (oldest entries) ─────────────────────────────────────
  console.log("Scrolling to oldest entries...");
  await scrollSidebarToBottom(page);
  const totalTiles = await page.locator(SEL_TILE).count();
  console.log(`\nLoaded ${totalTiles} tiles in sidebar.\n`);

  // ── Main loop: process tiles bottom → top ─────────────────────────────────
  const titleFirstSeen = new Map<string, Date>();
  const processedTileTexts = new Set<string>();
  let processed = 0, succeeded = 0, skipped = 0, noResponses = 0;

  console.log("Processing versions oldest → newest...\n");

  while (true) {
    // Collect tiles currently visible in the DOM
    const visibleTiles = await page.evaluate(
      ({ tileSel, headerSel, listSel }: { tileSel: string; headerSel: string; listSel: string }) => {
        const list = document.querySelector(listSel);
        if (!list) return [] as { tileText: string; headerText: string; tileIndex: number }[];
        const results: { tileText: string; headerText: string; tileIndex: number }[] = [];
        let currentHeader = "";
        let tileIdx = 0;
        list.querySelectorAll(`${tileSel}, ${headerSel}`).forEach((el) => {
          const text = (el as HTMLElement).innerText?.trim() ?? "";
          if (el.matches(headerSel)) {
            currentHeader = text;
          } else if (el.matches(tileSel)) {
            results.push({ tileText: text, headerText: currentHeader, tileIndex: tileIdx });
            tileIdx++;
          }
        });
        return results;
      },
      { tileSel: SEL_TILE, headerSel: SEL_HEADER, listSel: SEL_LIST }
    );

    // Filter: unprocessed, non-expand
    const unprocessed = visibleTiles
      .filter((t) => !processedTexts.has(t.tileText) && !t.tileText.toLowerCase().includes("expand"))
      .reverse(); // reverse = bottom of list first = oldest first

    for (const tile of unprocessed) {
      processedTileTexts.add(tile.tileText);

      const prevTitlebar = await getTitlebarText(page);

      // Start capturing network responses
      const captures: ResponseCapture[] = [];
      const responseHandler = async (response: Response) => {
        const url = response.url();
        if (!url.includes("docs.google.com")) return;
        const ct = response.headers()["content-type"] ?? "";
        // Skip binary/media responses
        if (/image|font|audio|video|woff/.test(ct)) return;
        try {
          const body = await response.text();
          if (body.length > 50) captures.push({ url, body });
        } catch {}
      };
      page.on("response", responseHandler);

      // Click the tile
      let clickOk = false;
      try {
        const loc = page.locator(SEL_TILE).nth(tile.tileIndex);
        await loc.scrollIntoViewIfNeeded({ timeout: 3000 });
        await loc.click({ timeout: 5000 });
        clickOk = true;
      } catch {
        page.off("response", responseHandler);
        skipped++;
        processed++;
        continue;
      }

      // Wait for version to load (titlebar text changes)
      const newTitlebar = await waitForVersionLoad(page, prevTitlebar);
      page.off("response", responseHandler);

      if (!newTitlebar) {
        skipped++;
        processed++;
        process.stdout.write(`  ${processed} (${succeeded} ok, ${skipped} skip) — TIMEOUT\r`);
        continue;
      }

      const date = parseVersionDate(newTitlebar) ?? parseVersionDate(tile.headerText);
      if (!date) {
        skipped++;
        processed++;
        continue;
      }

      if (debug) {
        console.log(`\n[debug] tile="${tile.tileText.slice(0,40)}" date="${newTitlebar}"`);
        console.log(`[debug] captured ${captures.length} responses:`);
        captures.forEach((c) => console.log(`  ${c.url.slice(0, 100)} (${c.body.length} bytes)`));
      }

      if (captures.length === 0) noResponses++;

      // Primary: search for known titles in response bodies
      let titles = findTitlesInResponses(captures, dbTitleMap);

      // Fallback: accessibility snapshot
      if (titles.length < 3) {
        const a11yTitles = await readTitlesViaAccessibility(page);
        if (a11yTitles.length > titles.length) {
          titles = a11yTitles.map(normalizeTitle).filter(Boolean);
        }
      }

      if (titles.length >= 3) {
        for (const title of titles) {
          if (!titleFirstSeen.has(title)) titleFirstSeen.set(title, date);
        }
        succeeded++;
      } else {
        skipped++;
        if (debug) console.log(`[debug] → no titles found (network: ${captures.length} responses, a11y: 0)`);
      }

      processed++;
      const dateStr = date.toISOString().split("T")[0];
      process.stdout.write(`  ${processed} (${succeeded} ok, ${skipped} skip) — ${dateStr}  \r`);

      await sleep(INTER_CLICK_PAUSE_MS);
    }

    // Check if we're done
    const atTop = await isAtTop(page);
    if (atTop && unprocessed.length === 0) break;

    // Scroll up to reveal older entries
    await scrollSidebar(page, -500);
    await sleep(500);
  }

  console.log(`\n\nFinished. ${processed} versions scanned, ${titleFirstSeen.size} unique titles found.`);
  if (noResponses > 0) {
    console.log(`\nNote: ${noResponses}/${processed} tile clicks produced 0 network responses.`);
    console.log("This may mean Google Sheets is serving revision data from browser cache,");
    console.log("or the data comes through a protocol we're not intercepting.");
    if (!debug) console.log("Re-run with --debug to see which response URLs are being captured.");
  }
  console.log();

  if (titleFirstSeen.size === 0) {
    console.log(
      "Zero titles found. To diagnose, re-run with --debug and look at the captured\n" +
      "response URLs. If you see 0 responses per tile, the data isn't coming from\n" +
      "network requests — Google Sheets is loading it from an internal JS cache.\n\n" +
      "In that case, run the inspect script on the IFRAME contents:\n" +
      "  npx tsx scripts/inspect-iframe-dom.ts <spreadsheet-id>\n"
    );
    await prisma.$disconnect();
    rl.close();
    process.exit(1);
  }

  // ── Match against DB ───────────────────────────────────────────────────────
  console.log(`Matching ${titleFirstSeen.size} found titles against ${movies.length} DB movies...\n`);

  const sheetTitles = Array.from(titleFirstSeen.keys());
  const fuse = new Fuse(sheetTitles, { threshold: 0.25, includeScore: true });

  const exactMatches: { id: number; title: string; date: Date }[] = [];
  const fuzzyMatches: { id: number; title: string; sheetTitle: string; date: Date; confidence: number }[] = [];
  const noMatch: string[] = [];

  for (const movie of movies) {
    const norm = normalizeTitle(movie.title);
    if (titleFirstSeen.has(norm)) {
      exactMatches.push({ id: movie.id, title: movie.title, date: titleFirstSeen.get(norm)! });
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

  console.log("── Match Summary ──────────────────────────────────────────────");
  console.log(`  Exact   : ${exactMatches.length}`);
  console.log(`  Fuzzy   : ${fuzzyMatches.length}`);
  console.log(`  No match: ${noMatch.length}\n`);

  if (fuzzyMatches.length > 0) {
    console.log("Fuzzy matches (review):");
    fuzzyMatches.slice(0, 20).forEach((m) => {
      console.log(`  "${m.title}" → "${m.sheetTitle}" (${m.confidence}%) → ${m.date.toISOString().split("T")[0]}`);
    });
    if (fuzzyMatches.length > 20) console.log(`  ... and ${fuzzyMatches.length - 20} more`);
    console.log();
  }

  const total = exactMatches.length + fuzzyMatches.length;

  if (dryRun) {
    console.log("Dry run complete. No changes written.");
    await prisma.$disconnect();
    rl.close();
    return;
  }

  if (total === 0) {
    console.log("Nothing to write.");
    await prisma.$disconnect();
    rl.close();
    return;
  }

  const confirm = await ask(`Write ${total} watch dates to the database? (yes/no): `);
  rl.close();
  if (confirm.trim().toLowerCase() !== "yes") {
    console.log("Aborted.");
    await prisma.$disconnect();
    return;
  }

  console.log("\nWriting...");
  for (const m of [...exactMatches, ...fuzzyMatches]) {
    await prisma.movie.update({ where: { id: m.id }, data: { watchedDate: m.date } });
  }
  await prisma.$disconnect();
  console.log(`Done. ${total} movies updated.`);
}

main().catch(console.error);
