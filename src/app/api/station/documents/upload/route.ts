import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import path from "path";
import fs from "fs";
import { writeFile } from "fs/promises";

const UPLOADS_BASE = path.join(process.cwd(), "uploads");

// Allowed file types and max size
const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".pdf"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Valid document types
const VALID_DOCUMENT_TYPES = [
  "DTI_CERT", "SEC_CERT", "BIR_2303", "MAYORS_PERMIT",
  "BARANGAY_CLEARANCE", "SANITARY_PERMIT", "WATER_TEST_BACTERIOLOGICAL",
  "WATER_TEST_PHYSICAL_CHEMICAL", "GOVT_ID", "FIRE_SAFETY_CERT",
  "PROOF_OF_ADDRESS", "STATION_PHOTO", "VIDEO_WALKTHROUGH",
];

// POST /api/station/documents/upload — Upload a compliance document
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get the user's station
    const station = await prisma.station.findFirst({
      where: { userId },
    });

    if (!station) {
      return NextResponse.json(
        { error: "No station found for this user. Please create a station first." },
        { status: 404 }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const documentType = formData.get("type") as string | null;
    const expiryDateStr = formData.get("expiryDate") as string | null;

    // New metadata fields
    const permitNumber = formData.get("permitNumber") as string | null;
    const issuingAuthority = formData.get("issuingAuthority") as string | null;
    const issueDateStr = formData.get("issueDate") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!documentType || !VALID_DOCUMENT_TYPES.includes(documentType)) {
      return NextResponse.json(
        { error: `Invalid document type. Must be one of: ${VALID_DOCUMENT_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate required metadata fields
    if (!permitNumber || !permitNumber.trim()) {
      return NextResponse.json(
        { error: "Permit / Certificate Number is required" },
        { status: 400 }
      );
    }

    if (!issuingAuthority || !issuingAuthority.trim()) {
      return NextResponse.json(
        { error: "Issuing Authority is required" },
        { status: 400 }
      );
    }

    if (!issueDateStr) {
      return NextResponse.json(
        { error: "Issue Date is required" },
        { status: 400 }
      );
    }

    // Parse issue date
    let issueDate: Date;
    issueDate = new Date(issueDateStr);
    if (isNaN(issueDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid issueDate format" },
        { status: 400 }
      );
    }

    // Parse expiry date if provided
    let expiryDate: Date | null = null;
    if (expiryDateStr) {
      expiryDate = new Date(expiryDateStr);
      if (isNaN(expiryDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid expiryDate format" },
          { status: 400 }
        );
      }
    }

    // Validate file type
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF, JPG, and PNG files are allowed." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Create directory structure: uploads/{stationId}/{documentType}/
    const stationDir = path.join(UPLOADS_BASE, station.id, documentType);
    fs.mkdirSync(stationDir, { recursive: true });

    // Generate unique filename to prevent collisions
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${timestamp}-${safeFileName}`;
    const filePath = path.join(stationDir, fileName);

    // Write file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Create database record
    const document = await prisma.stationDocument.create({
      data: {
        stationId: station.id,
        type: documentType,
        fileUrl: `/uploads/${station.id}/${documentType}/${fileName}`,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || ext === ".pdf" ? "application/pdf" : ext === ".png" ? "image/png" : "image/jpeg",
        verificationStatus: "PENDING",
        expiryDate: expiryDate ?? null,
        permitNumber: permitNumber!.trim(),
        issuingAuthority: issuingAuthority!.trim(),
        issueDate: issueDate,
      },
    });

    // Create verification log entry
    await prisma.verificationLog.create({
      data: {
        stationId: station.id,
        action: "DOCUMENT_UPLOADED",
        performedById: userId,
        details: JSON.stringify({
          documentId: document.id,
          documentType,
          fileName: file.name,
          fileSize: file.size,
        }),
      },
    });

    return NextResponse.json(
      { success: true, data: document },
      { status: 201 }
    );
  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload document" },
      { status: 500 }
    );
  }
}
