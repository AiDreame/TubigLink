import crypto from "crypto";

function key(name: string) {
  return crypto.createHash("sha256").update(process.env[name] || `aqualink-dev-${name}`).digest();
}
export function encryptPayout(value: string) { const iv=crypto.randomBytes(12); const c=crypto.createCipheriv("aes-256-gcm",key("PAYOUT_ENC_KEY"),iv); const data=Buffer.concat([c.update(value,"utf8"),c.final()]); return JSON.stringify({iv:iv.toString("base64"),tag:c.getAuthTag().toString("base64"),data:data.toString("base64")}); }
export function decryptPayout(value: string) { const x=JSON.parse(value); const d=crypto.createDecipheriv("aes-256-gcm",key("PAYOUT_ENC_KEY"),Buffer.from(x.iv,"base64")); d.setAuthTag(Buffer.from(x.tag,"base64")); return Buffer.concat([d.update(Buffer.from(x.data,"base64")),d.final()]).toString("utf8"); }
export function encryptOtp(code: string) { const iv=crypto.randomBytes(12); const c=crypto.createCipheriv("aes-256-gcm",key("OTP_ENC_KEY"),iv); const data=Buffer.concat([c.update(code,"utf8"),c.final()]); return JSON.stringify({iv:iv.toString("base64"),tag:c.getAuthTag().toString("base64"),data:data.toString("base64")}); }
export function decryptOtp(value: string) { const x=JSON.parse(value); const d=crypto.createDecipheriv("aes-256-gcm",key("OTP_ENC_KEY"),Buffer.from(x.iv,"base64")); d.setAuthTag(Buffer.from(x.tag,"base64")); return Buffer.concat([d.update(Buffer.from(x.data,"base64")),d.final()]).toString("utf8"); }
export function hashOtp(code: string) { return crypto.createHash("sha256").update(code).digest("hex"); }

/** Verify and consume a payout OTP, incrementing failed attempts atomically enough for route use. */
export async function verifyOtp(userId: string, purpose: string, code: unknown) {
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) return false;
  // Dynamic import avoids making the crypto-only helpers depend on Prisma at module load.
  const { default: prisma } = await import("@/lib/prisma");
  const row = await prisma.otpCode.findFirst({
    where: { userId, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!row || row.attempts >= 5 || row.expiresAt < new Date()) return false;
  if (hashOtp(code) !== row.codeHash) {
    await prisma.otpCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    return false;
  }
  await prisma.otpCode.update({ where: { id: row.id }, data: { consumedAt: new Date() } });
  return true;
}
