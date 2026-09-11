"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Shared "Report an issue" dialog — extracted verbatim from SupportFab so the
 * create-ticket flow is identical everywhere it's opened (the floating button
 * on any page and the visible button on /support).
 *
 * Posts to POST /api/support-tickets with { category, description, orderId }
 * (order link optional, restricted to the reporter's own orders), then shows a
 * confirmation view that links to the new ticket conversation at /support/<id>.
 */
export const ISSUE_CATEGORIES = [
  { value: "ORDER_PROBLEM", label: "Order problem" },
  { value: "PAYMENT", label: "Payment" },
  { value: "DELIVERY", label: "Delivery" },
  { value: "ACCOUNT", label: "Account" },
  { value: "APP_BUG", label: "App bug" },
  { value: "OTHER", label: "Other" },
];

export function ReportIssueDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [category, setCategory] = useState("OTHER");
  const [description, setDescription] = useState("");
  const [orderId, setOrderId] = useState<string>("");
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  // Load the reporter's own orders for the optional order linker.
  const loadOrders = async () => {
    try {
      const res = await fetch("/api/orders?limit=30");
      const data = await res.json();
      if (data.success) setOrders(data.data || []);
    } catch {
      /* non-fatal — the order linker is optional */
    } finally {
      setOrdersLoaded(true);
    }
  };

  const onOpenChangeWrapped = (v: boolean) => {
    if (v) {
      setError(null);
      setCreatedId(null);
      if (!ordersLoaded) loadOrders();
    }
    onOpenChange(v);
  };

  const submit = async () => {
    if (!description.trim()) {
      setError("Please describe the issue.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          description: description.trim(),
          orderId: orderId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Unable to submit");
      setCreatedId(data.data.id);
    } catch (err: any) {
      setError(err.message || "Unable to submit the issue.");
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm view after a successful submit — links straight to the ticket
  // conversation where Discord replies will land.
  if (open && createdId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChangeWrapped}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Issue reported</DialogTitle>
            <DialogDescription>
              Thanks — we&apos;ve received your report. AquaLink support will reply in the
              conversation below; any replies from the support team appear there.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChangeWrapped(false)}>
              Close
            </Button>
            <Button onClick={() => { window.location.href = `/support/${createdId}`; }}>
              View conversation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChangeWrapped}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report an issue</DialogTitle>
          <DialogDescription>
            Tell us what went wrong. Description is required; linking an order is optional —
            this works for any issue on any page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="issue-category">Issue category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="issue-category" className="mt-1 w-full">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {ISSUE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="issue-order">Link to an order (optional)</Label>
            <Select value={orderId} onValueChange={setOrderId}>
              <SelectTrigger id="issue-order" className="mt-1 w-full">
                <SelectValue placeholder={ordersLoaded ? "No order linked" : "Loading your orders…"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">No order linked</SelectItem>
                {orders.map((o: any) => (
                  <SelectItem key={o.id} value={o.id}>
                    Order #{o.id.slice(0, 8)} · ₱{Number(o.total || 0).toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="issue-description">Description</Label>
            <Textarea
              id="issue-description"
              className="mt-1 min-h-[96px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened? When? Any details that help us help you."
              maxLength={2000}
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChangeWrapped(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || !description.trim()}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
              </>
            ) : (
              "Submit issue"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}