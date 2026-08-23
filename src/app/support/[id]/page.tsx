"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useLiveRefresh } from "@/hooks/use-live-refresh";

const CATEGORY_LABEL: Record<string, string> = {
  ORDER_PROBLEM: "Order problem",
  PAYMENT: "Payment",
  DELIVERY: "Delivery",
  ACCOUNT: "Account",
  APP_BUG: "App bug",
  OTHER: "Other",
};

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  RESOLVED: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  CLOSED: "bg-muted text-muted-foreground",
};

export default function SupportTicketPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const [ticket, setTicket] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const fetchTicket = useCallback(async () => {
    try {
      // Ticket metadata comes from the (session-scoped) list; the conversation
      // from the messages route. Two calls keeps the API surface small.
      const [listRes, msgRes] = await Promise.all([
        fetch("/api/support-tickets"),
        fetch(`/api/support-tickets/${id}/messages`),
      ]);
      if (listRes.status === 401 || msgRes.status === 401) {
        router.replace("/auth/login");
        return;
      }
      const listData = await listRes.json();
      const msgData = await msgRes.json();
      const found = (listData.data || []).find((t: any) => t.id === id);
      if (!found && !listData.success) {
        setError(listData.error || "Ticket not found");
      } else {
        setTicket(found);
      }
      setMessages(msgData.success ? msgData.data || [] : []);
    } catch (err: any) {
      setError(err.message || "Unable to load this ticket");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchTicket(); }, [fetchTicket]);
  useLiveRefresh(fetchTicket);

  const sendReply = async () => {
    if (!replyText.trim()) return;
    setReplySending(true);
    setReplyError(null);
    try {
      const res = await fetch(`/api/support-tickets/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Unable to send reply");
      setReplyText("");
      await fetchTicket();
    } catch (err: any) {
      setReplyError(err.message || "Unable to send reply");
    } finally {
      setReplySending(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <Link href="/support" className="flex items-center gap-1 text-muted-foreground hover:text-foreground" aria-label="Back to support tickets">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Support conversation</h1>
      </header>

      <div className="max-w-xl mx-auto p-4">
        {loading && <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {ticket && (
          <div className="rounded-2xl border bg-card p-4 mb-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{CATEGORY_LABEL[ticket.category] || ticket.category}</span>
              <Badge className={`border-none ${STATUS_STYLE[ticket.status] || ""}`}>{ticket.status}</Badge>
            </div>
            <p className="mt-2 text-sm text-card-foreground whitespace-pre-wrap">{ticket.description}</p>
            {ticket.orderId && (
              <Link href={`/orders/${ticket.orderId}`} className="mt-2 inline-block text-sm text-blue-600 hover:underline">
                Linked order #{ticket.orderId.slice(0, 8)}
              </Link>
            )}
          </div>
        )}

        <div className="space-y-2 mb-4">
          {messages.length === 0 && !loading && (
            <p className="text-center text-muted-foreground text-sm py-8">No replies yet. Support will respond here.</p>
          )}
          {messages.map((msg: any) => {
            const isSupport = msg.authorRole === "STAFF" || msg.authorRole === "ADMIN";
            const label = isSupport
              ? "AquaLink Support"
              : msg.authorRole === "STATION"
                ? "Station"
                : "You";
            return (
              <div
                key={msg.id}
                className={
                  "rounded-xl p-2 " +
                  (isSupport ? "bg-blue-50 dark:bg-blue-900/20" : "bg-muted/50")
                }
              >
                <p className="font-semibold text-card-foreground text-[11px]">
                  {label}
                  {msg.authorName ? <span className="font-normal text-muted-foreground"> · {msg.authorName}</span> : null}
                </p>
                <p className="text-card-foreground whitespace-pre-wrap break-words">{msg.content}</p>
                <p className="text-[10px] text-muted-foreground">{format(new Date(msg.createdAt), "MMM d, h:mm a")}</p>
              </div>
            );
          })}
        </div>

        {ticket && ticket.status !== "CLOSED" && (
          <div className="rounded-2xl border bg-card p-3">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Reply to support…"
              rows={3}
              className="w-full"
            />
            {replyError && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{replyError}</p>}
            <Button className="mt-2 rounded-xl min-h-[40px]" onClick={sendReply} disabled={replySending || !replyText.trim()}>
              {replySending ? "Sending…" : "Send reply"}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
