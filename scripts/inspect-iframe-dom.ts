#!/usr/bin/env tsx
/**
 * inspect-iframe-dom.ts
 *
 * Opens version history, clicks one revision tile, then dumps:
 *   1. All network responses captured during the click (URLs + first 300 chars)
 *   2. The iframe's accessibility snapshot
 *   3. Any text-bearing DOM elements inside the iframe
 *
 * Run this if playwright-watch-dates.ts reports "0 network responses per tile".
 * The output will tell us exactly where the cell data lives.
 *
 * Usage:
 *   npx tsx scripts/inspect-iframe-dom.ts <spreadsheet-id>
 */

import path from "path";
import readline from "readline";
import { chromium } from "playwright";
import type { Page, Response } from "playwright";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string) => new Promise<string>((r) => rl.question(q, r));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SEL_LIST     = "div.appsDocsRevisionsWizSidebarRevisionsTilesList";
const SEL_TILE     = "div.appsDocsRevisionsWizSidebarRevisionTile";
const SEL_TITLEBAR = "h4.docs-revisions-chromecover-titlebar-name-label";
const SEL_IFRAME   = "iframe.waffle-revisions-frame";

async function main() {
  const fileId = process.argv[2];
  if (!fileId) {
    console.error("Usage: npx tsx scripts/inspect-iframe-dom.ts <spreadsheet-id>");
    process.exit(1);
  }

  console.log("Press Enter once Chrome is running and the spreadsheet is open...");
  await ask("");

  const browser = await chromium.connectOverCDP("http://localhost:9222");
  const context = browser.contexts()[0];
  const page =
    context.pages().find((p) => p.url().includes("docs.google.com/spreadsheets")) ??
    context.pages()[0];

  // Open version history
  console.log("Opening version history...");
  try {
    await page.locator('[aria-label="File"], #docs-file-menu').first().click();
    await sleep(700);
    await page.locator('li:has-text("Version history"), div:has-text("Version history")').first().hover();
    await sleep(500);
    await page.locator('li:has-text("See version history"), div:has-text("See version history")').first().click();
    await sleep(4000);
  } catch {
    await page.keyboard.press("Escape");
    await page.keyboard.press("Meta+Alt+Shift+KeyH");
    await sleep(4000);
  }

  if (await page.locator(SEL_LIST).count() === 0) {
    console.log("Open version history manually then press Enter...");
    await ask("");
  }

  // Find the FIRST non-expand tile and click it
  const tiles = await page.locator(SEL_TILE).all();
  let targetTile = null;
  for (const t of tiles) {
    const text = await t.innerText().catch(() => "");
    if (!text.toLowerCase().includes("expand")) {
      targetTile = t;
      break;
    }
  }
  if (!targetTile) {
    console.error("No clickable version tiles found.");
    process.exit(1);
  }

  const prevTitlebar = await page.locator(SEL_TITLEBAR).first().innerText().catch(() => "");

  // Capture responses during click
  const captures: { url: string; contentType: string; bodySnippet: string; size: number }[] = [];
  const handler = async (r: Response) => {
    if (!r.url().includes("docs.google.com")) return;
    const ct = r.headers()["content-type"] ?? "";
    try {
      const body = await r.text();
      captures.push({ url: r.url().slice(0, 120), contentType: ct.slice(0, 60), bodySnippet: body.slice(0, 300), size: body.length });
    } catch {
      captures.push({ url: r.url().slice(0, 120), contentType: ct.slice(0, 60), bodySnippet: "(read failed)", size: 0 });
    }
  };
  page.on("response", handler);

  console.log("Clicking first version tile...");
  await targetTile.click();

  // Wait for titlebar to change
  const deadline = Date.now() + 15000;
  let newTitlebar = "";
  while (Date.now() < deadline) {
    newTitlebar = await page.locator(SEL_TITLEBAR).first().innerText().catch(() => "");
    if (newTitlebar && newTitlebar !== prevTitlebar) break;
    await sleep(300);
  }
  await sleep(2000); // let any delayed responses arrive
  page.off("response", handler);

  console.log(`\nTitlebar: "${prevTitlebar}" → "${newTitlebar}"\n`);

  // ── Dump 1: Network responses ──────────────────────────────────────────────
  console.log(`── Network responses captured: ${captures.length} ──`);
  captures.forEach((c, i) => {
    console.log(`\n[${i}] URL: ${c.url}`);
    console.log(`    Content-Type: ${c.contentType}`);
    console.log(`    Size: ${c.size} bytes`);
    console.log(`    Body (first 300): ${c.bodySnippet.replace(/\n/g, "\\n").slice(0, 300)}`);
  });

  // ── Dump 2: Accessibility snapshot of iframe ───────────────────────────────
  console.log("\n── Accessibility snapshot of revision iframe ──");
  try {
    const iframeEl = page.locator(SEL_IFRAME).first();
    if (await iframeEl.count() > 0) {
      const handle = await iframeEl.elementHandle();
      if (handle) {
        const snapshot = await page.accessibility.snapshot({ root: handle });
        console.log(JSON.stringify(snapshot, null, 2).slice(0, 3000));
      }
    } else {
      console.log("iframe not found");
    }
  } catch (e) {
    console.log("Accessibility snapshot failed:", e);
  }

  // ── Dump 3: iframe DOM text content ───────────────────────────────────────
  console.log("\n── DOM text inside iframe (first 50 text nodes) ──");
  try {
    const iframeEl = page.locator(SEL_IFRAME).first();
    if (await iframeEl.count() > 0) {
      const frame = await iframeEl.contentFrame();
      if (frame) {
        const texts = await frame.evaluate(() => {
          const results: string[] = [];
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          let node: Text | null;
          while ((node = walker.nextNode() as Text) && results.length < 50) {
            const t = node.textContent?.trim();
            if (t && t.length > 2 && t.length < 200) results.push(t);
          }
          return results;
        });
        texts.forEach((t, i) => console.log(`[${i}] ${t}`));
        if (texts.length === 0) console.log("(no text nodes found in iframe)");
      } else {
        console.log("Could not access iframe frame (cross-origin?)");
      }
    }
  } catch (e) {
    console.log("iframe DOM read failed:", e);
  }

  rl.close();
  console.log("\nDone. Paste this output to diagnose the content reading issue.");
}

main().catch(console.error);
