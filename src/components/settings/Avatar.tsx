import Image from "next/image";
import { cn } from "@/lib/utils";

interface AvatarProps {
  image?: string | null;
  name?: string | null;
  email?: string | null;
  size?: number;
  className?: string;
}

function initial(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || "?";
  return source.charAt(0).toUpperCase();
}

export default function Avatar({
  image,
  name,
  email,
  size = 32,
  className,
}: AvatarProps) {
  const dimension = { width: size, height: size };

  if (image) {
    return (
      <Image
        src={image}
        alt={name ?? email ?? "Profile"}
        width={size}
        height={size}
        className={cn("rounded-full object-cover", className)}
      />
    );
  }

  return (
    <span
      style={dimension}
      className={cn(
        "flex items-center justify-center rounded-full bg-amber-400/15 font-semibold text-amber-400",
        className
      )}
    >
      <span style={{ fontSize: size * 0.45 }}>{initial(name, email)}</span>
    </span>
  );
}
