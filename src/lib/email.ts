export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export type SendEmailResult = { ok: true } | { ok: false; error: string };

/** Send an email through Resend without requiring an SDK dependency. */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "AquaLink PH <onboarding@resend.dev>",
        to,
        subject,
        html,
        text,
      }),
    });

    if (response.ok) {
      return { ok: true };
    }

    let error = `Resend returned HTTP ${response.status}`;
    try {
      const body = (await response.json()) as {
        message?: string;
        error?: string;
      };
      error = body.message || body.error || error;
    } catch {
      // Keep the HTTP status when Resend does not return JSON.
    }
    return { ok: false, error };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unable to contact Resend",
    };
  }
}
