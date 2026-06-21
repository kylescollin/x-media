#!/usr/bin/env tsx
/**
 * test-mobile-nav.ts
 *
 * Automated checks for the mobile bottom navigation. Verifies that every nav
 * tap target is large enough to hit reliably and that taps react quickly —
 * the two things Kyle noticed feel flaky on a phone.
 *
 * Three checks run against a mobile (iPhone 13) viewport:
 *   1. Tap-target size  — every bottom-nav <a> is >= 44x44 CSS px (WCAG 2.5.5).
 *   2. Response time     — tapping each nav item navigates within a threshold.
 *   3. Post-modal guard  — open a detail modal, close it, then immediately tap
 *                          a nav item; it must still navigate (the dialog
 *                          backdrop must not swallow the tap during its close).
 *
 * Auth: every page is gated by src/middleware.ts (redirect -> /auth/signin), so
 * the test reuses a saved Playwright storageState. Generate it once with:
 *
 *     npm run test:nav -- --login      # opens a headed browser to sign in
 *
 * Then run the checks (headless, reuses the saved session):
 *
 *     npm run test:nav
 *
 * Options / env:
 *   BASE_URL=http://localhost:3000   target server (default)
 *   --login                          interactive: sign in, save session, exit
 *   --headed                         show the browser while testing
 *   --threshold=1500                 max nav response time in ms (default 1500)
 *
 * A dev server must already be running (npm run dev).
 */

import path from "path";
import fs from "fs";
import readline from "readline";
import { chromium, devices } from "playwright";
import type { BrowserContext, Page } from "playwright";

// ── Config ────────────────────────────────────────────────────────────────────
const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const SESSION_DIR = path.join(__dirname, ".nav-session");
const STATE_PATH = path.join(SESSION_DIR, "state.json");
const DEVICE = devices["iPhone 13"];

const argv = process.argv.slice(2);
const LOGIN = argv.includes("--login");
const HEADED = argv.includes("--headed");
const THRESHOLD_MS = Number(
  (argv.find((a) => a.startsWith("--threshold=")) || "--threshold=1500").split("=")[1]
);

const MIN_TAP_PX = 44;
// Pages to sweep. Each nav target should be present and tappable on every page.
const PAGES = ["/library", "/tv", "/watchlist", "/validate", "/settings"];
// The five hrefs rendered by MobileNav.tsx.
const NAV_HREFS = ["/library", "/tv", "/watchlist", "/validate", "/settings"];

// Bottom-nav links live in the only <nav> with the sm:hidden class.
const NAV_SELECTOR = 'nav.sm\\:hidden a';

// ── Result tracking ────────────────────────────────────────────────────────────
let failures = 0;
function pass(msg: string) {
  console.log(`  ✓ ${msg}`);
}
function fail(msg: string) {
  failures++;
  console.log(`  ✗ ${msg}`);
}

// ── Interactive login (one-time) ────────────────────────────────────────────────
async function runLogin() {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ ...DEVICE });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/library`, { waitUntil: "domcontentloaded" });

  console.log(
    "\nA browser window is open. Sign in until you land on the app (e.g. /library),\n" +
      "then press Enter here to save the session."
  );
  await waitForEnter();

  await context.storageState({ path: STATE_PATH });
  console.log(`\nSaved session -> ${STATE_PATH}`);
  await browser.close();
}

function waitForEnter(): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question("", () => (rl.close(), resolve())));
}

// ── Helpers ──────────────────────────────────────────────────────────────────
async function gotoApp(page: Page, route: string) {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/auth/")) {
    throw new Error(
      "Redirected to /auth — session is missing or expired. Run: npm run test:nav -- --login"
    );
  }
  await page.locator(NAV_SELECTOR).first().waitFor({ state: "visible", timeout: 10_000 });
}

// ── Check 1: tap-target size ─────────────────────────────────────────────────
async function checkTapTargets(page: Page) {
  console.log("\n[1] Tap-target size (>= 44x44 px)");
  for (const route of PAGES) {
    await gotoApp(page, route);
    const links = page.locator(NAV_SELECTOR);
    const count = await links.count();
    if (count !== NAV_HREFS.length) {
      fail(`${route}: expected ${NAV_HREFS.length} nav links, found ${count}`);
      continue;
    }
    for (let i = 0; i < count; i++) {
      const box = await links.nth(i).boundingBox();
      const label =
        (await links.nth(i).getAttribute("href")) || `link ${i}`;
      if (!box) {
        fail(`${route} ${label}: no bounding box (not rendered?)`);
        continue;
      }
      const w = Math.round(box.width);
      const h = Math.round(box.height);
      if (w >= MIN_TAP_PX && h >= MIN_TAP_PX) {
        pass(`${route} ${label}: ${w}x${h}px`);
      } else {
        fail(`${route} ${label}: ${w}x${h}px (below ${MIN_TAP_PX}px)`);
      }
    }
  }
}

// ── Check 2: response time ───────────────────────────────────────────────────
async function checkResponseTime(page: Page) {
  console.log(`\n[2] Nav response time (< ${THRESHOLD_MS}ms)`);
  // Start somewhere, then tap each *other* destination in turn.
  await gotoApp(page, "/library");
  for (const href of NAV_HREFS) {
    if (page.url().includes(href)) continue;
    const link = page.locator(`${NAV_SELECTOR}[href="${href}"]`);
    const start = Date.now();
    await link.tap();
    try {
      await page.waitForURL(`**${href}**`, { timeout: THRESHOLD_MS + 2000 });
      const ms = Date.now() - start;
      if (ms < THRESHOLD_MS) pass(`tap ${href}: ${ms}ms`);
      else fail(`tap ${href}: ${ms}ms (>= ${THRESHOLD_MS}ms)`);
    } catch {
      fail(`tap ${href}: did not navigate within ${THRESHOLD_MS + 2000}ms`);
    }
  }
}

// ── Check 3: post-modal guard ────────────────────────────────────────────────
async function checkPostModalTap(page: Page) {
  console.log("\n[3] Nav tap immediately after closing a detail modal");
  await gotoApp(page, "/library");

  const card = page.locator('[role="button"]').first();
  if ((await card.count()) === 0) {
    console.log("  - skipped: no movie cards on /library to open a modal");
    return;
  }

  await card.tap();
  // Dialog.Popup is a fixed, centered overlay; wait for it to appear.
  const popup = page.locator('[role="dialog"]');
  await popup.first().waitFor({ state: "visible", timeout: 5000 });

  // Close via Escape (base-ui Dialog), then immediately tap a nav item without
  // waiting for the close animation — this is the case that used to be eaten.
  await page.keyboard.press("Escape");

  const target = "/tv";
  const link = page.locator(`${NAV_SELECTOR}[href="${target}"]`);
  const start = Date.now();
  await link.tap();
  try {
    await page.waitForURL(`**${target}**`, { timeout: THRESHOLD_MS + 2000 });
    pass(`post-modal tap ${target}: ${Date.now() - start}ms`);
  } catch {
    fail(`post-modal tap ${target}: did not navigate (backdrop swallowed the tap?)`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (LOGIN) {
    await runLogin();
    return;
  }

  if (!fs.existsSync(STATE_PATH)) {
    console.error(
      `No saved session at ${STATE_PATH}.\nRun: npm run test:nav -- --login`
    );
    process.exit(2);
  }

  console.log(`Target: ${BASE_URL}  (iPhone 13 viewport)`);
  const browser = await chromium.launch({ headless: !HEADED });
  let context: BrowserContext | undefined;
  try {
    context = await browser.newContext({ ...DEVICE, storageState: STATE_PATH });
    const page = await context.newPage();

    await checkTapTargets(page);
    await checkResponseTime(page);
    await checkPostModalTap(page);
  } finally {
    await context?.close();
    await browser.close();
  }

  console.log(
    `\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
