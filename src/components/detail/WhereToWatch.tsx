"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { tmdbImage } from "@/lib/tmdb";

interface WhereToWatchProps {
  tmdbId: number;
  mediaType: "movie" | "tv";
}

interface Provider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority: number;
}

interface RegionProviders {
  link?: string;
  flatrate?: Provider[];
  rent?: Provider[];
  buy?: Provider[];
}

const SECTIONS: { key: keyof RegionProviders; label: string }[] = [
  { key: "flatrate", label: "Stream" },
  { key: "rent", label: "Rent" },
  { key: "buy", label: "Buy" },
];

export default function WhereToWatch({ tmdbId, mediaType }: WhereToWatchProps) {
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState<RegionProviders | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/tmdb/watch-providers?tmdbId=${tmdbId}&type=${mediaType}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        setRegion(data?.results?.US ?? null);
      })
      .catch(() => {
        if (active) setRegion(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tmdbId, mediaType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-white/30">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const sections = SECTIONS.map((s) => ({
    ...s,
    providers: ((region?.[s.key] as Provider[] | undefined) ?? [])
      .slice()
      .sort((a, b) => a.display_priority - b.display_priority),
  })).filter((s) => s.providers.length > 0);

  if (!region || sections.length === 0) {
    return <p className="text-sm text-white/35">No streaming info available.</p>;
  }

  const link = region.link;

  return (
    <div className="flex flex-col gap-4">
      {sections.map((section) => (
        <div key={section.key} className="flex flex-col gap-2">
          <p className="text-xs text-white/35 font-medium tracking-wide uppercase">
            {section.label}
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {section.providers.map((p) => (
              <a
                key={p.provider_id}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-lg p-1 -m-1 transition-colors duration-100 hover:bg-white/8"
              >
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-white/8">
                  {p.logo_path ? (
                    <Image
                      src={tmdbImage(p.logo_path, "w154")}
                      alt={p.provider_name}
                      fill
                      sizes="36px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs text-white/40 font-semibold">
                      {p.provider_name[0]}
                    </div>
                  )}
                </div>
                <p className="text-[13px] font-medium text-white/80 leading-tight truncate">
                  {p.provider_name}
                </p>
              </a>
            ))}
          </div>
        </div>
      ))}
      <p className="text-[11px] text-white/30 pt-1">Powered by JustWatch via TMDB</p>
    </div>
  );
}
