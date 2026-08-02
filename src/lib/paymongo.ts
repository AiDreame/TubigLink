import "server-only";

const PAYMONGO_BASE_URL = "https://api.paymongo.com/v1";

export type PayMongoMetadata = Record<string, string>;

export type PayMongoData<T = unknown> = {
  id: string;
  type: string;
  attributes: T;
};

export type PayMongoError = {
  message: string;
  code?: string;
  status?: number;
};

export type PayMongoResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: PayMongoError };

export type PayMongoConfig = {
  publicKey?: string;
  webhookSecret?: string;
  appUrl: string;
};

export type CreatePaymentIntentInput = {
  amountCentavos: number;
  description: string;
  metadata?: PayMongoMetadata;
  idempotencyKey?: string;
};

export type AttachPaymentMethodInput = {
  paymentMethodId: string;
  returnUrl: string;
};

export type CreateRefundInput = {
  amountCentavos: number;
  paymentId: string;
  reason: string;
  idempotencyKey?: string;
};

/** Server-side PayMongo configuration. The secret key is intentionally not returned. */
export function getPayMongoConfig(): PayMongoConfig {
  return {
    publicKey: process.env.PAYMONGO_PUBLIC_KEY,
    webhookSecret: process.env.PAYMONGO_WEBHOOK_SECRET,
    // NEXT_PUBLIC_APP_URL is the app-wide public URL convention; INVITE_BASE_URL
    // remains a backwards-compatible fallback for existing deployments.
    appUrl:
      process.env.NEXT_PUBLIC_APP_URL || process.env.INVITE_BASE_URL || "",
  };
}

function getSecretKey(): string | undefined {
  return process.env.PAYMONGO_SECRET_KEY;
}

async function request<T>(
  path: string,
  options: {
    method: "GET" | "POST";
    body?: unknown;
    idempotencyKey?: string;
  },
): Promise<PayMongoResult<T>> {
  const secretKey = getSecretKey();
  if (!secretKey) {
    return {
      ok: false,
      error: { message: "PAYMONGO_SECRET_KEY not configured" },
    };
  }

  const headers: Record<string, string> = {
    Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
    "Content-Type": "application/json",
  };
  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }

  try {
    const response = await fetch(`${PAYMONGO_BASE_URL}${path}`, {
      method: options.method,
      headers,
      ...(options.body === undefined
        ? {}
        : { body: JSON.stringify(options.body) }),
    });

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }

    if (response.ok) {
      return { ok: true, data: payload as T };
    }

    const body = payload as {
      errors?: Array<{ detail?: string; code?: string; status?: string }>;
      message?: string;
    };
    const providerError = body?.errors?.[0];
    return {
      ok: false,
      error: {
        message:
          providerError?.detail ||
          body?.message ||
          `PayMongo returned HTTP ${response.status}`,
        ...(providerError?.code ? { code: providerError.code } : {}),
        status: response.status,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        message:
          error instanceof Error ? error.message : "Unable to contact PayMongo",
      },
    };
  }
}

export function createPaymentIntent({
  amountCentavos,
  description,
  metadata,
  idempotencyKey,
}: CreatePaymentIntentInput): Promise<PayMongoResult<PayMongoData>> {
  return request<PayMongoData>("/payment_intents", {
    method: "POST",
    idempotencyKey,
    body: {
      data: {
        attributes: {
          amount: amountCentavos,
          currency: "PHP",
          payment_method_allowed: ["gcash"],
          description,
          ...(metadata ? { metadata } : {}),
        },
      },
    },
  });
}

export function attachPaymentMethod(
  paymentIntentId: string,
  { paymentMethodId, returnUrl }: AttachPaymentMethodInput,
): Promise<PayMongoResult<PayMongoData>> {
  return request<PayMongoData>(
    `/payment_intents/${encodeURIComponent(paymentIntentId)}/attach`,
    {
      method: "POST",
      body: {
        data: {
          attributes: {
            payment_method: paymentMethodId,
            return_url: returnUrl,
          },
        },
      },
    },
  );
}

export function getPaymentIntent(
  id: string,
): Promise<PayMongoResult<PayMongoData>> {
  return request<PayMongoData>(`/payment_intents/${encodeURIComponent(id)}`, {
    method: "GET",
  });
}

export function createRefund({
  amountCentavos,
  paymentId,
  reason,
  idempotencyKey,
}: CreateRefundInput): Promise<PayMongoResult<PayMongoData>> {
  return request<PayMongoData>("/refunds", {
    method: "POST",
    idempotencyKey,
    body: {
      data: {
        attributes: {
          amount: amountCentavos,
          payment_id: paymentId,
          reason,
        },
      },
    },
  });
}
