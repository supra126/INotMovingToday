"use client";

import { useEffect, useRef } from "react";

interface BlobVideoProps {
  blob: Blob;
  className?: string;
  autoPlay?: boolean;
}

/**
 * Plays a stored Blob. The object URL is created and revoked in the same effect (like BlobImage):
 * a URL made during render and revoked by an effect cleanup can be revoked while the player still
 * reads from it (React runs effects twice in development), which stopped large 1080p videos after ~3 s.
 */
export function BlobVideo({ blob, className, autoPlay = false }: BlobVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    const url = URL.createObjectURL(blob);
    if (video) video.src = url;
    return () => {
      if (video?.src === url) video.removeAttribute("src");
      URL.revokeObjectURL(url);
    };
  }, [blob]);

  return <video ref={ref} controls playsInline muted={autoPlay} autoPlay={autoPlay} loop={autoPlay} className={className} />;
}
