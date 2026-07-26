"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { DOCUMENT_TYPE_LABELS } from "@/lib/constants";

const TOTAL_REQUIRED = Object.keys(DOCUMENT_TYPE_LABELS).length; // 13

export default function DocumentsBadge() {
  const { data: session } = useSession();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;

    async function fetchCount() {
      try {
        const res = await fetch("/api/station/documents");
        const data = await res.json();
        if (!data.success || !Array.isArray(data.data)) return;
        const uniqueTypes = new Set(data.data.map((d: { type: string }) => d.type));
        const unsubmitted = TOTAL_REQUIRED - uniqueTypes.size;
        if (!cancelled) setCount(unsubmitted);
      } catch {
        // Silently fail — badge simply won't show
      }
    }

    fetchCount();
    return () => { cancelled = true; };
  }, [session]);

  if (count === null || count <= 0) return null;

  return (
    <span className="ml-auto flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
      !
    </span>
  );
}
