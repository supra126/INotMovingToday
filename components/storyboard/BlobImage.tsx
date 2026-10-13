"use client";

import { useEffect, useRef } from "react";

interface BlobImageProps {
  blob: Blob;
  alt: string;
  className?: string;
  onClick?: () => void;
}

/** Shows a stored Blob, revoking its object URL when it changes */
export function BlobImage({ blob, alt, className, onClick }: BlobImageProps) {
  const ref = useRef<HTMLImageElement>(null);

  // Set src directly so the URL is created and revoked in the same effect
  useEffect(() => {
    const url = URL.createObjectURL(blob);
    if (ref.current) ref.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  // Object URLs cannot go through next/image
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} alt={alt} className={className} onClick={onClick} />;
}
