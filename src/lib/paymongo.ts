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
  metadata?: PayMongoMetadata;
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
      cache: "no-store",
      ...(options.body === undefined
        ? {}
        : { body: JSON.stringify(options.body) }),
    });

    const rawText = await response.text();
    if (path === "/payment_methods") {
      console.error(
        `[PayMongo] ${path} ->`,
        response.status,
        response.headers.get("content-type"),
        rawText.slice(0, 800),
        `secretKeySet=${Boolean(process.env.PAYMONGO_SECRET_KEY)}`,
      );
    }
    let payload: unknown;
    try {
      payload = rawText ? JSON.parse(rawText) : undefined;
    } catch {
      payload = undefined;
    }

    if (response.ok) {
      // PayMongo wraps success responses in { data: <resource> }. Unwrap so
      // callers can use result.data.id / result.data.attributes directly
      // (matches PayMongoData). Fall back to the payload as-is if no envelope.
      const envelope = payload as { data?: T } | null;
      const unwrapped = envelope?.data;
      return { ok: true, data: (unwrapped === undefined ? payload : unwrapped) as T };
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

export function createGcashPaymentMethod(options: {
  idempotencyKey?: string;
} = {}): Promise<PayMongoResult<PayMongoData>> {
  return request<PayMongoData>("/payment_methods", {
    method: "POST",
    idempotencyKey: options.idempotencyKey,
    body: {
      data: {
        attributes: {
          type: "gcash",
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
  metadata,
}: CreateRefundInput): Promise<PayMongoResult<PayMongoData>> {
  return request<PayMongoData>("/refunds", {
    method: "POST",
    idempotencyKey,
    body: {
      data: {
        attributes: {
          amount: amountCentavos,
          payment_id: paymentId,
          // PayMongo refund reasons: duplicate, fraudulent, requested_by_customer, others.
          reason: ["duplicate", "fraudulent", "requested_by_customer", "others"].includes(reason)
            ? reason
            : "requested_by_customer",
          currency: "PHP",
          ...(metadata ? { metadata } : {}),
        },
      },
    },
  });
}
