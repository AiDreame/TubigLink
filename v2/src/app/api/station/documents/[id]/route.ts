import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import fs from "fs";
import path from "path";

const UPLOADS_BASE = path.join(process.cwd(), "uploads");

// DELETE /api/station/documents/[id] — Delete a document (station owner only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const documentId = params.id;

    // Get the document with station info
    const document = await prisma.stationDocument.findUnique({
      where: { id: documentId },
      include: { station: { select: { userId: true, id: true } } },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Only the station owner can delete their documents
    if (document.station.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow deletion of PENDING or REJECTED documents
    if (!["PENDING", "REJECTED"].includes(document.verificationStatus)) {
      return NextResponse.json(
        { error: "Cannot delete a document that has already been verified or expired" },
        { status: 400 }
      );
    }

    // Delete file from disk
    const filePath = path.join(UPLOADS_BASE, document.stationId, document.type, path.basename(document.fileUrl));
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fileErr) {
      console.error("Failed to delete file from disk:", fileErr);
      // Continue with DB deletion even if file delete fails
    }

    // Delete database record
    await prisma.stationDocument.delete({
      where: { id: documentId },
    });

    // Create verification log entry
    await prisma.verificationLog.create({
      data: {
        stationId: document.stationId,
        action: "DOCUMENT_DELETED",
        performedById: userId,
        details: JSON.stringify({
          documentId: document.id,
          documentType: document.type,
          fileName: document.fileName,
          action: "DELETED",
        }),
      },
    });

    return NextResponse.json({ success: true, message: "Document deleted" });
  } catch (error) {
    console.error("Document delete error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
