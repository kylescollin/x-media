"use client";

import { Search, X } from "lucide-react";

interface MovieSearchProps {
  value: string;
  onChange: (v: string) => void;
}

export default function MovieSearch({ value, onChange }: MovieSearchProps) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search titles…"
        className="w-full h-9 rounded-lg bg-white/5 border border-white/8 pl-9 pr-8 text-sm text-white placeholder:text-white/30
          focus:outline-none focus:border-white/20 focus:bg-white/8
          transition-colors duration-150"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
