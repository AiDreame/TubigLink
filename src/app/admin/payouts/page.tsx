"use client";
import { useEffect, useState } from "react";
const peso = (n: number) => `₱${(n / 100).toFixed(2)}`;
export default function Payouts() {
  const [rows, setRows] = useState<any[]>([]), [start, setStart] = useState(""), [end, setEnd] = useState(""), [msg, setMsg] = useState("");
  const load = () => fetch("/api/admin/payouts").then(r => r.json()).then(x => setRows(x.data || []));
  useEffect(() => { load() }, []);
  async function act(id: string, a: string, body?: any) {
    const r = await fetch(`/api/admin/payouts/${id}/${a}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const x = await r.json();
    setMsg(r.ok ? "" : (x.error || "Action failed"));
    load();
  }
  async function prepare() {
    const r = await fetch("/api/admin/payouts/prepare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ periodStart: start, periodEnd: end }) });
    const x = await r.json();
    setMsg(r.ok ? `Prepared ${x.summary.ordersIncluded} orders across ${x.summary.payoutsCreated} payouts` : x.error);
    load();
  }
  const destination = (p: any) => {
    const s = p.station || {};
    if (!s.payoutMethod) return "No payout account configured";
    const last4 = s.payoutAccountLast4 ? ` •••• ${s.payoutAccountLast4}` : "";
    return `${s.payoutMethod}${s.payoutMethod === "BANK" && s.payoutBankName ? ` · ${s.payoutBankName}` : ""}${last4}`;
  };
  return <main className="space-y-6 p-8"><h1 className="text-3xl font-bold">Weekly payouts</h1>
    <section className="flex flex-wrap items-end gap-3 rounded border bg-white p-4"><label>Start<input type="date" className="ml-2 rounded border p-2" value={start} onChange={e => setStart(e.target.value)} /></label><label>End<input type="date" className="ml-2 rounded border p-2" value={end} onChange={e => setEnd(e.target.value)} /></label><button className="rounded bg-blue-600 px-4 py-2 text-white" onClick={prepare}>Prepare new payout</button></section>
    {msg && <p className="text-sm text-red-600">{msg}</p>}
    {rows.map(p => <details key={p.id} className="rounded border bg-white p-4">
      <summary className="cursor-pointer"><b>{p.station.name}</b> · {p.status} · {peso(p.netCentavos)} <span className="ml-4 text-sm text-slate-500">{destination(p)} · Gross {peso(p.grossCentavos)} · PayMongo fee {peso(p.processingFeeCentavos || 0)} · Commission {peso(p.commissionCentavos)} · Held {peso(p.heldCentavos)} · Adjustments {p.adjustmentCentavos < 0 ? `−${peso(-p.adjustmentCentavos)}` : peso(p.adjustmentCentavos)} · {p.periodStart.slice(0, 10)}–{p.periodEnd.slice(0, 10)}</span></summary>
      <div className="mt-4 space-y-2">
        {p.payoutItems.map((i: any) => <p key={i.id} className="text-sm">Order {i.orderId} · {peso(i.grossCentavos)} gross · {peso(i.processingFeeCentavos || 0)} PayMongo fee · {peso(i.commissionCentavos)} commission · {peso(i.netCentavos)} net</p>)}
        {(p.paymongoTransactionId || p.paymongoStatus) && <div className="rounded bg-slate-50 p-2 text-sm"><p><b>PayMongo</b> {p.paymongoStatus || ""} {p.paymongoTransactionId ? `· ${p.paymongoTransactionId}` : ""}{p.paymongoReferenceNumber ? ` · ref ${p.paymongoReferenceNumber}` : ""}</p>{p.paymongoError ? <p className="text-red-600">{p.paymongoError}</p> : null}{p.status === "PAYING" ? <p className="text-amber-600">Disbursement in flight — the transfer webhook will finalize this payout (InstaPay can take up to 20 min).</p> : null}</div>}
        <div className="flex flex-wrap gap-2 pt-2">
          {p.status === "DRAFT" && <button className="rounded bg-green-600 px-3 py-1 text-white" onClick={() => act(p.id, "approve")}>Approve</button>}
          {p.status === "APPROVED" && <button className="rounded bg-blue-600 px-3 py-1 text-white" onClick={() => act(p.id, "process")}>Mark processing</button>}
          {p.status === "PROCESSING" && <>
            <button className="rounded bg-green-600 px-3 py-1 text-white" onClick={() => act(p.id, "pay")}>Send via PayMongo</button>
            <button className="rounded bg-red-600 px-3 py-1 text-white" onClick={() => act(p.id, "fail", { failureMessage: "Manual transfer failed" })}>Mark failed</button>
          </>}
          {p.status === "PAYING" && <span className="rounded bg-amber-100 px-3 py-1 text-sm text-amber-700">Awaiting webhook finalization…</span>}
        </div>
      </div>
    </details>)}
  </main>;
}
