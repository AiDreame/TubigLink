/**
 * Server-initiated disbursements via the PayMongo Disbursements API
 * (Create a Wallet Transaction).
 *
 * AUTHORITATIVE ENDPOINT (verified against docs.paymongo.com, OAS dated
 * 2026-01-13): POST /v1/wallets/{wallet_id}/transactions
 *   NOTE: the commonly-cited POST /v1/wallet_transactions DOES NOT EXIST —
 *   it 404s with `resource_not_found`. Transactions are scoped under a wallet:
 *   GET /v1/wallets lists the account's wallet(s); the account must be
 *   wallet-enabled (owner's DTI/business verification) before a wallet exists.
 *   Verified Aug 9 2026 with our sk_test_: GET /v1/wallets returns
 *   {"has_more":false,"data":null} — NO WALLET on this account yet.
 *
 * Request schema (required): amount (integer centavos, min 1), provider
 * ("instapay" | "pesonet"), receiver { bank_account_name, bank_account_number,
 * bank_code }, type ("send_money"). Optional: description, purpose, callback_url.
 * Header: Idempotency-Key on every write.
 *
 * Rails: InstaPay (real-time, ≤₱50k/tx) or PESONet — chosen by provider +
 * receiving institution. Test mode simulates; live money movement is gated on
 * the owner's PayMongo business verification (wallet-enabled account).
 *
 * bank_code semantics: the receiving-institution `id` from
 * GET /v1/wallets/receiving_institutions?provider=instapay (verified Aug 9,
 * 2026, test keys) — see /home/team/shared/payout-rails-findings.md. If the
 * API rejects these once a wallet exists, fall back to the institution's
 * `provider_code` (e.g. G-Xchange's SWIFT-style code) — flagged for Step 2b.
 */
const PAYMONGO_BASE_URL = "https://api.paymongo.com/v1";

/** Disbursement cost per transfer (₱10; one free per week). Station-borne, deducted from payout (owner Aug 9). */
export const PAYOUT_DISBURSEMENT_FEE_PESOS = 10;

/**
 * InstaPay receiving-institution ids keyed by the exact `payoutBankName`
 * values the station payout-settings picker stores (plus GCASH).
 * GCash is payable directly through institution "G-Xchange, Inc." (id 35).
 * Sent to PayMongo as receiver.bank_code (string).
 *
 * Ids re-verified live Aug 9, 2026 against
 * GET /v1/wallets/receiving_institutions?provider=instapay (93 institutions).
 * NOTE: differs from the original findings file for RCBC (67, not 28),
 * PNB (59, not 8) and EastWest (29, not 62) — see
 * /home/team/shared/payout-disbursement-test.md.
 */
export const PAYOUT_BANK_IDS: Record<string, number> = {
  GCASH: 35, // G-Xchange, Inc. (GXCHPHM2XXX)
  BPI: 7, // Bank of the Philippine Islands / BPI Family (BOPIPHMMXXX)
  BDO: 10, // BDO Unibank, Inc. (BNORPHMMXXX)
  UnionBank: 84, // Union Bank of the Philippines (UBPHPHMMXXX)
  Metrobank: 49, // Metropolitan Bank and Trust Company (MBTCPHMMXXX)
  Landbank: 40, // Land Bank of The Philippines (TLBPPHMMXXX)
  RCBC: 67, // Rizal Commercial Banking Corporation (RCBCPHMMXXX)
  PNB: 59, // Philippine National Bank (PNBMPHMMTOD)
  "Security Bank": 71, // Security Bank Corporation (SETCPHMMXXX)
  EastWest: 29, // East West Banking Corporation (EWBCPHMMXXX)
  Chinabank: 19, // China Banking Corporation (CHBKPHMMXXX)
};

export type PayoutDisbursementTarget = {
  /** Station.payoutMethod — "GCASH" | "BANK" */
  method: string;
  /** Station.payoutBankName (required for BANK; ignored for GCASH) */
  bankName?: string | null;
  /** Station.payoutAccountName */
  accountName: string;
  /** Decrypted account number (GCash = mobile number as stored; bank = account number) */
  accountNumber: string;
};

export type PayoutDisbursementInput = {
  /** Payout.netCentavos — already in centavos */
  amountCentavos: number;
  /** Idempotency-Key — use the payout id so retries can never double-send */
  idempotencyKey: string;
  /** PayMongo callback URL (webhook endpoint) for async status updates */
  callbackUrl?: string;
  /** "instapay" (default) or "pesonet" */
  provider?: "instapay" | "pesonet";
  /** Optional wallet id override; otherwise resolved via GET /v1/wallets */
  walletId?: string;
  target: PayoutDisbursementTarget;
};

export type PayoutDisbursementData = {
  id: string;
  type?: string;
  status: string; // pending | succeeded | failed
  fee: number;
  netAmount: number;
  referenceNumber?: string | null;
  providerError?: string | null;
  providerErrorCode?: string | null;
  transferId?: string | null;
  receiver?: Record<string, unknown> | null;
};

export type PayoutDisbursementResult =
  | { ok: true; data: PayoutDisbursementData }
  | { ok: false; error: { message: string; code?: string; status?: number } };

/** Resolve the receiving-institution id for a station's payout target (null = unknown). */
export function resolveBankId(target: PayoutDisbursementTarget): number | null {
  const key = target.method === "GCASH" ? "GCASH" : target.bankName || "";
  return PAYOUT_BANK_IDS[key] ?? null;
}

function secretKey(): string | undefined {
  return process.env.PAYMONGO_SECRET_KEY;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function toInt(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Resolve the account's PayMongo wallet id (wallet_...) for disbursements. */
export async function resolveWalletId(): Promise<
  { ok: true; walletId: string } | { ok: false; error: { message: string; status?: number } }
> {
  const envWalletId = process.env.PAYMONGO_WALLET_ID;
  if (envWalletId) return { ok: true, walletId: envWalletId };
  const key = secretKey();
  if (!key) return { ok: false, error: { message: "PAYMONGO_SECRET_KEY not configured" } };
  try {
    const response = await fetch(`${PAYMONGO_BASE_URL}/wallets`, {
      headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}` },
      cache: "no-store",
    });
    if (!response.ok) {
      return { ok: false, error: { message: `PayMongo returned HTTP ${response.status}`, status: response.status } };
    }
    const payload = (await response.json()) as { data?: Array<{ id: string }> | null };
    const walletId = Array.isArray(payload.data) ? payload.data[0]?.id : undefined;
    if (!walletId) {
      return {
        ok: false,
        error: {
          message:
            "No PayMongo wallet on this account — disbursements require a wallet-enabled account (owner's DTI/business verification, see go-live prerequisites)",
        },
      };
    }
    return { ok: true, walletId };
  } catch (error) {
    return { ok: false, error: { message: error instanceof Error ? error.message : "Unable to contact PayMongo" } };
  }
}

/**
 * Create a PayMongo wallet transaction (server-initiated disbursement).
 * Sends an Idempotency-Key on every write; the caller must never retry the
 * same payout id after a non-duplicate failure (AM05/DU03 are duplicate errors
 * — treat them as already-sent, never auto-retry).
 */
export async function createWalletTransaction(
  input: PayoutDisbursementInput,
): Promise<PayoutDisbursementResult> {
  const bankId = resolveBankId(input.target);
  if (bankId === null) {
    return {
      ok: false,
      error: {
        message: `Unknown payout destination (method=${input.target.method}, bank=${input.target.bankName || "none"})`,
      },
    };
  }
  const key = secretKey();
  if (!key) {
    return { ok: false, error: { message: "PAYMONGO_SECRET_KEY not configured" } };
  }
  const wallet = await resolveWalletId();
  if (!wallet.ok) return { ok: false, error: wallet.error };

  const body = {
    data: {
      attributes: {
        amount: input.amountCentavos,
        provider: input.provider || "instapay",
        type: "send_money",
        receiver: {
          bank_account_name: input.target.accountName,
          bank_account_number: input.target.accountNumber,
          bank_code: String(bankId),
        },
        description: `AquaLink station payout ${input.idempotencyKey}`,
        ...(input.callbackUrl ? { callback_url: input.callbackUrl } : {}),
        purpose: `AquaLink weekly payout ${input.idempotencyKey}`,
      },
    },
  };
  const headers: Record<string, string> = {
    Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
    "Content-Type": "application/json",
    "Idempotency-Key": input.idempotencyKey,
  };
  try {
    const response = await fetch(
      `${PAYMONGO_BASE_URL}/wallets/${encodeURIComponent(wallet.walletId)}/transactions`,
      {
        method: "POST",
        headers,
        cache: "no-store",
        body: JSON.stringify(body),
      },
    );
    const rawText = await response.text();
    let payload: unknown;
    try {
      payload = rawText ? JSON.parse(rawText) : undefined;
    } catch {
      payload = undefined;
    }
    if (response.ok) {
      const envelope = payload as { data?: { id: string; type?: string; attributes?: Record<string, unknown> } } | null;
      const resource = envelope?.data;
      const attrs = resource?.attributes ?? {};
      return {
        ok: true,
        data: {
          id: resource?.id || "",
          type: resource?.type,
          status: text(attrs.status) || "pending",
          fee: toInt(attrs.fee) ?? 0,
          netAmount: toInt(attrs.net_amount) ?? 0,
          referenceNumber: text(attrs.reference_number),
          providerError: text(attrs.provider_error),
          providerErrorCode: text(attrs.provider_error_code),
          transferId: text(attrs.transfer_id),
          receiver: attrs.receiver ? (attrs.receiver as Record<string, unknown>) : null,
        },
      };
    }
    const err = payload as {
      errors?: Array<{ detail?: string; code?: string; status?: string }>;
      message?: string;
    };
    const providerError = err?.errors?.[0];
    return {
      ok: false,
      error: {
        message: providerError?.detail || err?.message || `PayMongo returned HTTP ${response.status}`,
        ...(providerError?.code ? { code: providerError.code } : {}),
        status: response.status,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : "Unable to contact PayMongo",
      },
    };
  }
}
