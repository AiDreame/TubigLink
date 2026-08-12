"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/ErrorState";

type QrData = {
  station: { id: string; name: string; slug: string };
  payload: string;
};

export default function StationQrPage() {
  const [data, setData] = useState<QrData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/dashboard/qr");
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("You don't have access to this station's QR code.");
        }
        throw new Error("Failed to load the QR code. Please try again.");
      }
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load the QR code.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <main className="flex items-center justify-center p-8">
        <ErrorState title="QR Code" message={error} onRetry={load} />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="space-y-6 p-6 lg:p-8">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mx-auto h-96 w-full max-w-md" />
      </main>
    );
  }

  const filename = `aqualink-${data.station.slug || data.station.id}-qr.png`;
  const pngUrl = "/api/dashboard/qr/png";
  const inlinePngUrl = `${pngUrl}?inline=1`;

  return (
    <main className="space-y-6 p-6 lg:p-8">
      {/* Page chrome — hidden when printing (only the QR card prints). */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">QR Code</h1>
          <p className="mt-1 max-w-xl text-sm text-gray-500 dark:text-gray-400">
            Print this code and display it at your station. Customers scan it
            with their phone camera and land straight on your AquaLink store
            page to browse and order.
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline" className="rounded-xl">
            <a href={pngUrl} download={filename}>
              <Download className="h-4 w-4 mr-2" />
              Download PNG
            </a>
          </Button>
          <Button className="rounded-xl" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* The QR card — the only element that prints. */}
      <div className="qr-card mx-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm print:max-w-none print:rounded-none print:border-0 print:bg-white print:p-2 print:shadow-none">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
          AquaLink PH
        </p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-900">
          {data.station.name}
        </h2>
        <p className="mt-1 text-sm text-gray-500">Scan to order from us on AquaLink</p>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={inlinePngUrl}
          alt={`QR code for ${data.station.name}`}
          width={512}
          height={512}
          className="mx-auto mt-6 h-auto w-full max-w-[320px] print:max-w-[340px]"
        />

        <p className="mt-6 break-all text-[10px] leading-tight text-gray-400">
          {data.payload}
        </p>
      </div>
    </main>
  );
}
