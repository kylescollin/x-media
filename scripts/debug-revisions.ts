#!/usr/bin/env tsx
/**
 * debug-revisions.ts
 *
 * Diagnostic tool — shows the first and last 5 revisions the Drive API
 * returns, whether they have exportLinks, and what HTTP response we get
 * when trying to download them as CSV.
 *
 * Usage:
 *   npx tsx scripts/debug-revisions.ts <spreadsheet-id>
 */

import fs from "fs";
import path from "path";
import { google } from "googleapis";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const CREDENTIALS_PATH = path.join(__dirname, "..", "credentials.json");
const TOKEN_PATH = path.join(__dirname, "token.json");

async function getAuthClient() {
  const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
  const { client_secret, client_id } = creds.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    "http://localhost:3333/oauth2callback"
  );
  const saved = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
  oAuth2Client.setCredentials(saved);
  const { credentials } = await oAuth2Client
    .refreshAccessToken()
    .catch(() => ({ credentials: saved }));
  oAuth2Client.setCredentials(credentials);
  return oAuth2Client;
}

async function main() {
  const fileId = process.argv[2];
  if (!fileId) {
    console.error("Usage: npx tsx scripts/debug-revisions.ts <spreadsheet-id>");
    process.exit(1);
  }

  const auth = await getAuthClient();
  const drive = google.drive({ version: "v3", auth: auth as any });

  // ── 1. List all revisions ──────────────────────────────────────────────
  console.log("Fetching revision list...\n");

  const allRevisions: { id: string; modifiedTime: string; exportLinks?: Record<string, string> }[] = [];
  let pageToken: string | undefined;

  do {
    const res = await drive.revisions.list({
      fileId,
      fields: "nextPageToken,revisions(id,modifiedTime,exportLinks)",
      pageSize: 1000,
      ...(pageToken ? { pageToken } : {}),
    });
    for (const r of res.data.revisions ?? []) {
      if (r.id && r.modifiedTime) {
        allRevisions.push({
          id: r.id,
          modifiedTime: r.modifiedTime,
          exportLinks: (r.exportLinks as Record<string, string>) ?? undefined,
        });
      }
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  allRevisions.sort(
    (a, b) => new Date(a.modifiedTime).getTime() - new Date(b.modifiedTime).getTime()
  );

  console.log(`Total revisions returned by API: ${allRevisions.length}`);
  console.log(`Oldest: ${allRevisions[0]?.modifiedTime}`);
  console.log(`Newest: ${allRevisions[allRevisions.length - 1]?.modifiedTime}\n`);

  // How many have exportLinks?
  const withLinks = allRevisions.filter((r) => r.exportLinks?.["text/csv"]);
  console.log(`Revisions with exportLinks["text/csv"]: ${withLinks.length}/${allRevisions.length}\n`);

  // ── 2. Sample: oldest 5 + newest 5 ────────────────────────────────────
  const samples = [
    ...allRevisions.slice(0, 5),
    ...allRevisions.slice(-5),
  ];
  const seen = new Set<string>();
  const unique = samples.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  console.log("── Sampling oldest 5 + newest 5 revisions ────────────────────\n");

  const tokenRes = await (auth as any).getAccessToken();
  const token: string = tokenRes.token;

  for (const rev of unique) {
    const date = rev.modifiedTime.split("T")[0];
    const hasExportLink = !!rev.exportLinks?.["text/csv"];

    const exportUrl =
      rev.exportLinks?.["text/csv"] ??
      `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv&revision=${rev.id}`;

    // Try downloading
    let status = "—";
    let bodyPreview = "";
    try {
      const res = await fetch(exportUrl, {
        headers: { Authorization: `Bearer ${token}` },
        redirect: "follow",
      });
      status = `HTTP ${res.status}`;
      if (res.ok) {
        const text = await res.text();
        const firstLine = text.split("\n")[0].slice(0, 80);
        bodyPreview = `→ "${firstLine}..."`;
      } else {
        const errText = (await res.text()).slice(0, 120).replace(/\n/g, " ");
        bodyPreview = `→ ${errText}`;
      }
    } catch (e: any) {
      status = `ERROR: ${e.message}`;
    }

    console.log(`[${date}] id=${rev.id} exportLinks=${hasExportLink} | ${status} ${bodyPreview}`);
  }

  console.log("\nDone.");
}

main().catch(console.error);
