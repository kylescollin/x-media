"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface PosterImageProps {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  draggable?: boolean;
  /** Extra classes for the underlying image (object-cover is always applied). */
  className?: string;
}

/**
 * `next/image` (fill) with an animated shimmer placeholder that fades out once
 * the image loads. Drop-in for any poster/backdrop rendered inside a `relative`
 * container. Robust to cached images (which may not fire `onLoad`) via a
 * `complete` check on mount.
 */
export default function PosterImage({
  src,
  alt,
  sizes,
  priority,
  draggable,
  className,
}: PosterImageProps) {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (ref.current?.complete) setLoaded(true);
  }, []);

  return (
    <>
      <Image
        ref={ref}
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        draggable={draggable}
        onLoad={() => setLoaded(true)}
        className={cn("object-cover", className)}
      />
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 shimmer pointer-events-none transition-opacity duration-500",
          loaded ? "opacity-0" : "opacity-100"
        )}
      />
    </>
  );
}
