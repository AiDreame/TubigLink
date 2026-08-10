"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, MessageSquare } from "lucide-react";
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
  responseDeadlineAt: string;
  openedAt: string;
  customer: { id: string; name: string | null; phone: string | null };
}

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  STATION_RESPONDED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  UNDER_REVIEW: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  REFUND_PENDING: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  REFUNDED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  REJECTED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

export default function DisputesPage() {
  const [rows, setRows] = useState<DisputeRow[]>([]);
  const [selected, setSelected] = useState<DisputeRow | null>(null);
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/dashboard/disputes");
      const json = await res.json();
      setRows(json.data || []);
    } catch {
      setError("Failed to load disputes");
    }
  };
  useEffect(() => {
    load();
  }, []);

  async function submit() {
    if (!selected || !response.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/disputes/${selected.id}/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Failed to submit response");
        return;
      }
      setSelected(null);
      setResponse("");
      load();
    } catch {
      setError("Failed to submit response");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-red-500" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Customer disputes</h1>
          <p className="text-sm text-muted-foreground">
            Respond to issue reports within 24 hours of filing.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3">
          {error}
        </div>
      )}

      {rows.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No disputes yet — when a customer reports an issue on one of your orders it will appear here.
        </div>
      )}

      <div className="space-y-3">
        {rows.map((d) => (
          <div key={d.id} className="rounded-xl border bg-card p-4 shadow-sm space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <b className="text-sm">Order #{d.orderId.slice(0, 8).toUpperCase()}</b>
              <Badge className={`rounded-full ${STATUS_STYLES[d.status] || "bg-gray-100 text-gray-600"}`}>
                {d.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {d.type.replace(/_/g, " ")} · ₱{(d.amountHeldCentavos / 100).toFixed(2)} held ·{" "}
              {d.customer.name || d.customer.phone}
            </p>
            {d.description && (
              <p className="text-sm whitespace-pre-wrap rounded-lg bg-muted/50 p-2.5">{d.description}</p>
            )}
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              Opened {new Date(d.openedAt).toLocaleString()} · respond by{" "}
              {new Date(d.responseDeadlineAt).toLocaleString()}
            </p>
            {d.evidence && (
              <div className="mt-2">
                <DisputeEvidence evidence={d.evidence} alt="Customer evidence photo" />
              </div>
            )}
            {d.stationResponse && (
              <div className="mt-2 rounded-lg border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10 p-2.5 text-sm">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                  <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" /> Your response
                  {d.stationRespondedAt && (
                    <span className="font-normal text-muted-foreground">
                      · {new Date(d.stationRespondedAt).toLocaleString()}
                    </span>
                  )}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{d.stationResponse}</p>
              </div>
            )}
            {["OPEN", "STATION_RESPONDED"].includes(d.status) && (
              <Button
                className="mt-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white min-h-[44px]"
                onClick={() => {
                  setSelected(d);
                  setResponse(d.stationResponse || "");
                  setError(null);
                }}
              >
                {d.stationResponse ? "Update response" : "Respond"}
              </Button>
            )}
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl border">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600" aria-hidden="true" />
              <h2 className="text-lg font-bold">Respond to dispute</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Order #{selected.orderId.slice(0, 8).toUpperCase()} — your reply is shown to the
              customer and the AquaLink team.
            </p>
            <Textarea
              className="mt-4 min-h-32 w-full rounded-xl border p-3 text-sm"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Explain what happened and how you'll resolve it…"
            />
            {error && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setSelected(null)}
                className="rounded-xl min-h-[44px]"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white min-h-[44px]"
                onClick={submit}
                disabled={submitting || !response.trim()}
              >
                {submitting ? "Submitting…" : "Submit response"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
