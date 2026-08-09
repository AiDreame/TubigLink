"use client";

import { useState } from "react";

// Dispute `evidence` is a string — either an uploaded image path (/uploads/...),
// a pasted image URL (http...), or free-form text. Render paths/URLs as an
// image thumbnail (falling back to raw text if the image fails to load); render
// anything else as text.
export function isImageEvidence(evidence?: string | null): boolean {
  if (!evidence) return false;
  return (
    evidence.startsWith("/") ||
    evidence.startsWith("http://") ||
    evidence.startsWith("https://")
  );
}

export default function DisputeEvidence({
  evidence,
  alt = "Issue evidence",
}: {
  evidence?: string | null;
  alt?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!evidence) return null;

  if (!isImageEvidence(evidence) || imageFailed) {
    return (
      <p className="text-xs text-muted-foreground break-all whitespace-pre-wrap">{evidence}</p>
    );
  }

  return (
    <a href={evidence} target="_blank" rel="noopener noreferrer" className="block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={evidence}
        alt={alt}
        onError={() => setImageFailed(true)}
        className="rounded-xl border border-border max-h-48 w-auto object-cover"
      />
    </a>
  );
}
