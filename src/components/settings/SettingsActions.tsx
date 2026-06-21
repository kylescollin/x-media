"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import ExportButton from "@/components/library/ExportButton";

export default function SettingsActions() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-1 text-lg font-semibold text-white">Export</h2>
        <p className="mb-4 text-sm text-white/40">
          Download your library as a CSV, ready for Google Sheets or Excel.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButton type="movie" />
          <ExportButton type="tv" />
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold text-white">Account</h2>
        <p className="mb-4 text-sm text-white/40">
          Sign out of Kyle&apos;s Media on this device.
        </p>
        <button
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 text-white/90 text-sm font-semibold h-8 px-3 hover:bg-white/8 transition-colors cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign out</span>
        </button>
      </section>
    </div>
  );
}
