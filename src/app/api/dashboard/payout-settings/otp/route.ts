import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "crypto";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { encryptOtp, hashOtp } from "@/lib/payout-security";
import { sendEmail, type SendEmailResult } from "@/lib/email";
import { tooManyRequests } from "@/lib/rate-limit";

const EMAIL_SEND_TIMEOUT_MS = 8000;

// S-05 (security audit 2026-08-14): OTP send is the email-bomb vector — every
// request writes an OTP row AND fires an email to the recipient's inbox. Throttle
// per recipient (the station owner who receives the code): 60s cooldown between
// sends + 10/day cap. Implemented against the OtpCode rows themselves (every
// send writes one), so it survives process restarts and adds no in-memory state.
const OTP_COOLDOWN_MS = 60 * 1000;
const OTP_DAILY_CAP = 10;

export async function POST(req: NextRequest) {
  try {
    const user: any = (await getServerSession(authOptions))?.user;
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const b = await req.json();
    if (!["ADD", "EDIT", "REVEAL", "REMOVE"].includes(b.action))
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    const station = await prisma.station.findFirst({
      where: user.role === "ADMIN" && b.stationId ? { id: b.stationId } : { userId: user.id },
      include: { user: true },
    });
    if (!station || (user.role !== "ADMIN" && station.userId !== user.id))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // S-05: throttles below are keyed on the OTP recipient (station.userId) —
    // that inbox is what an email bomb would flood.
    const now = Date.now();
    const recentRow = await prisma.otpCode.findFirst({
      where: { userId: station.userId, createdAt: { gte: new Date(now - OTP_COOLDOWN_MS) } },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    if (recentRow) {
      const retryAfterSec = Math.max(1, Math.ceil((recentRow.createdAt.getTime() + OTP_COOLDOWN_MS - now) / 1000));
      return tooManyRequests(
        "Please wait about a minute before requesting another security code.",
        retryAfterSec
      );
    }
    const oldestInWindow = await prisma.otpCode.findFirst({
      where: { userId: station.userId, createdAt: { gte: new Date(now - 24 * 3600 * 1000) } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    const sentToday = await prisma.otpCode.count({
      where: { userId: station.userId, createdAt: { gte: new Date(now - 24 * 3600 * 1000) } },
    });
    if (sentToday >= OTP_DAILY_CAP) {
      // Reset happens as the oldest row in the window ages past 24h; fall back
      // to 1h if we somehow cannot compute it.
      const retryAfterSec = oldestInWindow
        ? Math.max(1, Math.ceil((oldestInWindow.createdAt.getTime() + 24 * 3600 * 1000 - now) / 1000))
        : 3600;
      return tooManyRequests(
        `You've reached today's limit of ${OTP_DAILY_CAP} security codes. Please try again tomorrow.`,
        retryAfterSec
      );
    }
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
    const row = await prisma.otpCode.create({
      data: {
        userId: station.userId,
        purpose: `PAYOUT_${b.action}`,
        codeHash: hashOtp(code),
        codeEncrypted: encryptOtp(code),
        expiresAt: new Date(Date.now() + 600000),
      },
    });
    // The OTP row is already created; the response must not depend on email
    // delivery. Race the Resend call against a timeout so a slow/hanging email
    // request cannot block the API response. On timeout we honestly report
    // FAILED (delivery not confirmed) — the record still exists for retry.
    const emailPromise = sendEmail({
      to: station.user.email || "",
      subject: "Your AquaLink payout security code",
      text: `Your AquaLink payout security code is ${code}. It expires in 10 minutes.`,
      html: `<p>Your AquaLink payout security code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`,
    });
    const timeout = new Promise<SendEmailResult>((resolve) =>
      setTimeout(() => resolve({ ok: false, error: "Email send timed out" }), EMAIL_SEND_TIMEOUT_MS)
    );
    const email = await Promise.race([emailPromise, timeout]);
    return NextResponse.json({
      success: true,
      emailStatus: email.ok ? "SENT" : "FAILED",
      expiresAt: row.expiresAt,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
