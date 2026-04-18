"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MovieSearchProps {
  value: string;
  onChange: (v: string) => void;
}

export default function MovieSearch({ value, onChange }: MovieSearchProps) {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  useEffect(() => {
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative flex items-center">
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          aria-label="Search titles"
          className={cn(
            "flex items-center justify-center h-9 w-9 rounded-lg border transition-colors duration-150",
            value
              ? "border-white/20 bg-white/10 text-white/70"
              : "border-white/8 bg-white/5 text-white/30 hover:text-white/60 hover:border-white/15"
          )}
        >
          <Search className="h-4 w-4" />
        </button>
      ) : (
        <div className="relative animate-in fade-in-0 duration-150">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setExpanded(false);
                inputRef.current?.blur();
              }
            }}
            placeholder="Search titles…"
            className="h-9 w-48 sm:w-64 rounded-lg bg-white/5 border border-white/8 pl-9 pr-8 text-sm text-white placeholder:text-white/30
              focus:outline-none focus:border-white/20 focus:bg-white/8 transition-colors duration-150"
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
      )}
    </div>
  );
}
