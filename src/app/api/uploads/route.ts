import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import crypto from "crypto";
import { consumeUploadQuota, tooManyRequests } from "@/lib/rate-limit";

// POST /api/uploads — Upload an image for a customer issue report (dispute).
// Any logged-in user may upload; files land in uploads/disputes/ and are served
// at /uploads/disputes/<random>.<ext> via the existing /uploads/:path* rewrite
// + /api/uploads/[...path] route (the same pattern used by delivery photos and
// station documents). The returned URL is stored as the dispute `evidence`
// string, so the disputes API contract is unchanged (evidence stays a string —
// now it can be an uploaded path or a URL).
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

// Detect the image type from magic bytes — never trust the client filename or
// declared MIME on its own.
function detectImageType(buf: Buffer): "jpeg" | "png" | "webp" | "gif" | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return "png";
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) return "webp";
  if (
    buf.length >= 6 &&
    (buf.toString("ascii", 0, 6) === "GIF87a" || buf.toString("ascii", 0, 6) === "GIF89a")
  ) return "gif";
  return null;
}

const EXT_BY_TYPE: Record<string, string> = { jpeg: "jpg", png: "png", webp: "webp", gif: "gif" };
const MIME_BY_TYPE: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 413 }
      );
    }

    // Declared MIME must be an image…
    const declaredMime = (file.type || "").toLowerCase();
    if (!declaredMime.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid file type — image files only" }, { status: 400 });
    }

    // …and the magic bytes must confirm a supported image format.
    const buffer = Buffer.from(await file.arrayBuffer());
    const detected = detectImageType(buffer);
    if (!detected) {
      return NextResponse.json(
        { error: "Invalid file type — only JPEG, PNG, WebP, and GIF images are allowed" },
        { status: 400 }
      );
    }
    if (declaredMime !== MIME_BY_TYPE[detected]) {
      return NextResponse.json(
        { error: "File contents do not match the declared file type" },
        { status: 400 }
      );
    }

    // S-05 (security audit 2026-08-14): per-user upload quota — 50 MB per
    // rolling 24h (in-memory; no Upload model in the schema). Keeps the
    // existing 5 MB-per-file cap; this stops storage fill from unlimited
    // uploads. Consumed before write; only fully validated files count.
    const quota = consumeUploadQuota(user.id, buffer.length);
    if (!quota.ok) {
      return tooManyRequests(
        "You've reached today's upload limit. Please try again later.",
        quota.retryAfterSec
      );
    }

    const dir = path.join(process.cwd(), "uploads", "disputes");
    await mkdir(dir, { recursive: true });
    const fileName = `${crypto.randomUUID()}.${EXT_BY_TYPE[detected]}`;
    await writeFile(path.join(dir, fileName), buffer);

    return NextResponse.json({ success: true, url: `/uploads/disputes/${fileName}` });
  } catch (error) {
    console.error("Dispute image upload error:", error);
    return NextResponse.json({ success: false, error: "Failed to upload image" }, { status: 500 });
  }
}
