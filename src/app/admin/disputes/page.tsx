"use client";

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import DisputeEvidence from "@/components/shared/DisputeEvidence";

interface DisputeRow {
  id: string;
  orderId: string;
  type: string;
  status: string;
  description: string;
  evidence: string | null;
  amountHeldCentavos: number;
  stationResponse: string | null;
  stationRespondedAt: string | null;
  openedAt: string;
  customer: { name: string | null; phone: string | null };
  station: { id: string; name: string };
  order: { id: string; total: number; paymentStatus: string; paymentId: string | null; paymentIntentId: string | null };
  refund: { id: string; status: string; failureMessage: string | null } | null;
}

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  STATION_RESPONDED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  UNDER_REVIEW: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  REFUND_PENDING: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  REFUNDED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  REJECTED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

export default function AdminDisputes() {
  const [rows, setRows] = useState<DisputeRow[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/admin/disputes");
      const json = await res.json();
      setRows(json.data || []);
    } catch {
      setError("Failed to load disputes");
    }
  };
  useEffect(() => {
    load();
  }, []);

  async function act(url: string) {
    const res = await fetch(url, { method: "POST" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error || "Action failed");
    }
    load();
  }

  async function resolve(id: string, decision: string) {
    setError(null);
    const res = await fetch("/api/admin/disputes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, decision, note }),
    });
    const json = await res.json();
    if (!res.ok) setError(json.error || "Resolution failed");
    setNote("");
    load();
  }

  const canResolve = (status: string) => ["OPEN", "STATION_RESPONDED", "UNDER_REVIEW"].includes(status);

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
          <ShieldAlert className="h-5 w-5 text-red-500" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Dispute review</h1>
          <p className="text-sm text-muted-foreground">
            Review customer issue reports, station responses, and issue refunds.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Resolution note (optional)</span>
        <input
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          placeholder="e.g. Full refund issued — quality concern verified"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {rows.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No disputes to review.
        </div>
      )}

      <div className="space-y-4">
        {rows.map((d) => (
          <div key={d.id} className="rounded-xl border bg-card p-4 shadow-sm space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <b className="text-sm">
                Order #{d.orderId.slice(0, 8).toUpperCase()} · {d.type.replace(/_/g, " ")}
              </b>
              <Badge className={`rounded-full ${STATUS_STYLES[d.status] || "bg-gray-100 text-gray-600"}`}>
                {d.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Customer: {d.customer.name || d.customer.phone} · Station: {d.station.name} · Opened{" "}
              {new Date(d.openedAt).toLocaleString()}
            </p>
            {d.description && (
              <p className="text-sm whitespace-pre-wrap rounded-lg bg-muted/50 p-2.5">{d.description}</p>
            )}
            {d.evidence && (
              <div className="mt-1">
                <DisputeEvidence evidence={d.evidence} alt="Dispute evidence photo" />
              </div>
            )}
            {d.stationResponse && (
              <div className="rounded-lg border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10 p-2.5 text-sm">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  Station response
                  {d.stationRespondedAt && (
                    <span className="font-normal text-muted-foreground">
                      {" "}· {new Date(d.stationRespondedAt).toLocaleString()}
                    </span>
                  )}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{d.stationResponse}</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Status: {d.status.replace(/_/g, " ")} · ₱{(d.amountHeldCentavos / 100).toFixed(2)} held
            </p>
            {d.refund && (
              <p className="text-sm font-medium">
                Refund: {d.refund.status.replace(/_/g, " ")}
                {d.refund.failureMessage && <span className="text-red-600 dark:text-red-400"> — {d.refund.failureMessage}</span>}
              </p>
            )}
            {d.refund?.status === "FAILED" && d.refund && (
              <Button className="rounded bg-red-600 px-3 py-2 text-white min-h-[44px]" onClick={() => act(`/api/admin/refunds/${d.refund!.id}/retry`)}>
                Retry refund
              </Button>
            )}
            {d.refund?.status === "PENDING" && !d.order.paymentId && !d.order.paymentIntentId && d.refund && (
              <Button className="rounded bg-blue-600 px-3 py-2 text-white min-h-[44px]" onClick={() => act(`/api/admin/refunds/${d.refund!.id}/complete`)}>
                Mark manual refund done
              </Button>
            )}
            {canResolve(d.status) && (
              <div className="flex flex-wrap gap-2 pt-1">
                <Button className="rounded bg-green-600 px-3 py-2 text-white min-h-[44px]" onClick={() => resolve(d.id, "REFUND_QUALITY")}>
                  Refund quality
                </Button>
                <Button className="rounded bg-orange-600 px-3 py-2 text-white min-h-[44px]" onClick={() => resolve(d.id, "REFUND_NOT_DELIVERED")}>
                  Refund not delivered
                </Button>
                <Button className="rounded border px-3 py-2 min-h-[44px]" onClick={() => resolve(d.id, "REJECT")}>
                  Reject
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
