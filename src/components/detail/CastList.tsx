import Image from "next/image";
import { tmdbImage } from "@/lib/tmdb";
import type { CastMember } from "@/types";

interface CastListProps {
  cast: CastMember[];
}

export default function CastList({ cast }: CastListProps) {
  if (cast.length === 0)
    return <p className="text-sm text-white/35">No cast information available.</p>;

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {cast.map((member) => (
        <div key={member.id} className="flex items-center gap-2.5">
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white/8">
            {member.profilePath ? (
              <Image
                src={tmdbImage(member.profilePath, "w154")}
                alt={member.name}
                fill
                sizes="36px"
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-xs text-white/40 font-semibold">
                {member.name[0]}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-white/80 leading-tight truncate">{member.name}</p>
            <p className="text-[11px] text-white/35 truncate">{member.character}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
