"use client";

import { Dialog } from "@base-ui/react/dialog";
import MovieDetailContent from "@/components/detail/MovieDetailContent";
import type { Movie } from "@/types";

interface MovieDetailModalProps {
  movie: Movie | null;
  onClose: () => void;
}

export default function MovieDetailModal({ movie, onClose }: MovieDetailModalProps) {
  return (
    <Dialog.Root
      open={!!movie}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        {/* Cinematic dark overlay */}
        <Dialog.Backdrop
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm
            data-open:animate-in data-open:fade-in-0
            data-closed:animate-out data-closed:fade-out-0
            duration-200"
        />

        {/* Modal popup */}
        <Dialog.Popup
          className="fixed top-1/2 left-1/2 z-50
            w-full max-w-[calc(100%-2rem)] sm:max-w-2xl
            -translate-x-1/2 -translate-y-1/2
            rounded-2xl overflow-hidden outline-none
            ring-1 ring-white/8
            max-h-[92vh] overflow-y-auto scrollbar-thin
            data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.97]
            data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-[0.97]
            duration-200"
        >
          {movie && <MovieDetailContent movie={movie} onClose={onClose} />}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
