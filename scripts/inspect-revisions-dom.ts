#!/usr/bin/env tsx
/**
 * inspect-revisions-dom.ts
 *
 * Connects to Chrome, opens version history on your spreadsheet,
 * then dumps the DOM structure of the sidebar so we can find the
 * right selectors for the version entries.
 *
 * Usage (with Chrome already running on port 9222 + spreadsheet open):
 *   npx tsx scripts/inspect-revisions-dom.ts <spreadsheet-id>
 */

import { chromium } from "playwright";
import readline from "readline";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string) => new Promise<string>((r) => rl.question(q, r));
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const fileId = process.argv[2];
  if (!fileId) {
    console.error("Usage: npx tsx scripts/inspect-revisions-dom.ts <spreadsheet-id>");
    process.exit(1);
  }

  const browser = await chromium.connectOverCDP("http://localhost:9222");
  const context = browser.contexts()[0];
  const page = context.pages().find(p => p.url().includes("docs.google.com/spreadsheets"))
    ?? context.pages()[0];

  // Open version history via File menu
  console.log("Opening version history...");
  try {
    await page.locator('[aria-label="File"], #docs-file-menu').first().click();
    await sleep(600);
    await page.locator('li:has-text("Version history"), div:has-text("Version history")').first().hover();
    await sleep(400);
    await page.locator('li:has-text("See version history"), div:has-text("See version history")').first().click();
    await sleep(2500);
  } catch {
    console.log("Menu failed — trying keyboard shortcut...");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Meta+Alt+Shift+KeyH");
    await sleep(2500);
  }

  console.log("\nVersion history should be open. Press Enter to inspect the DOM...");
  await ask("");

  // ── Dump 1: All elements with "revision" anywhere in their class ──────────
  const revisionElements = await page.evaluate(() => {
    const results: { tag: string; classes: string; role: string; text: string; childCount: number }[] = [];
    document.querySelectorAll("*").forEach(el => {
      const cls = el.className;
      if (typeof cls === "string" && cls.toLowerCase().includes("revision")) {
        results.push({
          tag: el.tagName,
          classes: cls.slice(0, 120),
          role: el.getAttribute("role") ?? "",
          text: (el as HTMLElement).innerText?.slice(0, 60).replace(/\n/g, " ") ?? "",
          childCount: el.children.length,
        });
      }
    });
    return results;
  });

  console.log(`\n── Elements with "revision" in class name (${revisionElements.length} total) ──`);
  revisionElements.forEach((el, i) => {
    console.log(`[${i}] <${el.tag}> classes="${el.classes}" role="${el.role}" children=${el.childCount}`);
    if (el.text) console.log(`     text: "${el.text}"`);
  });

  // ── Dump 2: The full innerHTML of the sidebar container ───────────────────
  console.log("\n── Sidebar container innerHTML (first 4000 chars) ──");
  const sidebarHtml = await page.evaluate(() => {
    // Try to find the outermost revision container
    const candidates = [
      document.querySelector('[class*="revision-sidebar"]'),
      document.querySelector('[class*="revisions-sidebar"]'),
      document.querySelector('[class*="revision-panel"]'),
      // Fall back: find element that contains "revision" class AND has many children
      ...Array.from(document.querySelectorAll("*")).filter(el => {
        const cls = el.className;
        return typeof cls === "string" && cls.includes("revision") && el.children.length > 3;
      }),
    ].filter(Boolean);

    if (candidates[0]) {
      return candidates[0]!.innerHTML.slice(0, 4000);
    }
    return "No sidebar container found.";
  });
  console.log(sidebarHtml);

  // ── Dump 3: All elements that contain year-like text (dates) ─────────────
  console.log("\n── Elements containing date-like text (2015–2026) ──");
  const dateElements = await page.evaluate(() => {
    const results: { tag: string; classes: string; role: string; text: string }[] = [];
    const datePattern = /20(1[5-9]|2[0-6])/;
    document.querySelectorAll("*").forEach(el => {
      const text = (el as HTMLElement).innerText;
      if (text && datePattern.test(text) && text.length < 80 && el.children.length < 4) {
        results.push({
          tag: el.tagName,
          classes: (el.className as string).slice(0, 80),
          role: el.getAttribute("role") ?? "",
          text: text.replace(/\n/g, " ").slice(0, 60),
        });
      }
    });
    return results.slice(0, 30); // first 30
  });
  dateElements.forEach((el, i) => {
    console.log(`[${i}] <${el.tag}> classes="${el.classes}" role="${el.role}" → "${el.text}"`);
  });

  // ── Dump 4: All elements with role="option" or role="listitem" ───────────
  console.log("\n── Elements with role=option or role=listitem ──");
  const roleElements = await page.evaluate(() => {
    const results: { role: string; classes: string; text: string }[] = [];
    document.querySelectorAll('[role="option"], [role="listitem"]').forEach(el => {
      results.push({
        role: el.getAttribute("role") ?? "",
        classes: (el.className as string).slice(0, 80),
        text: (el as HTMLElement).innerText?.replace(/\n/g, " ").slice(0, 80) ?? "",
      });
    });
    return results.slice(0, 20);
  });
  roleElements.forEach((el, i) => {
    console.log(`[${i}] role="${el.role}" classes="${el.classes}" → "${el.text}"`);
  });

  await browser.close();
  rl.close();
  console.log("\nDone. Paste this output and we'll fix the selectors.");
}

main().catch(console.error);
