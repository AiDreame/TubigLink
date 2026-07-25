import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/admin/verification/review — Approve or reject a station document
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminId = session.user.id;
    const body = await req.json();
    const { stationId, documentId, action, rejectionReason } = body;

    // Validate required fields
    if (!stationId || !documentId || !action) {
      return NextResponse.json(
        { error: "stationId, documentId, and action are required" },
        { status: 400 }
      );
    }

    if (!["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be either APPROVE or REJECT" },
        { status: 400 }
      );
    }

    if (action === "REJECT" && !rejectionReason) {
      return NextResponse.json(
        { error: "Rejection reason is required when rejecting a document" },
        { status: 400 }
      );
    }

    // Verify the document exists and belongs to the specified station
    const document = await prisma.stationDocument.findFirst({
      where: { id: documentId, stationId },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (document.verificationStatus !== "PENDING") {
      return NextResponse.json(
        { error: `Document has already been ${document.verificationStatus.toLowerCase()}. Cannot review again.` },
        { status: 400 }
      );
    }

    // Update document verification status
    const newStatus = action === "APPROVE" ? "VERIFIED" : "REJECTED";
    const updatedDocument = await prisma.stationDocument.update({
      where: { id: documentId },
      data: {
        verificationStatus: newStatus,
        rejectionReason: action === "REJECT" ? rejectionReason : null,
        verifiedById: adminId,
        verifiedAt: new Date(),
      },
    });

    // Create verification log entry
    await prisma.verificationLog.create({
      data: {
        stationId,
        action: action === "APPROVE" ? "DOCUMENT_VERIFIED" : "DOCUMENT_REJECTED",
        performedById: adminId,
        details: JSON.stringify({
          documentId,
          documentType: document.type,
          fileName: document.fileName,
          newStatus,
          rejectionReason: action === "REJECT" ? rejectionReason : null,
        }),
      },
    });

    // Check if all documents for this station are now VERIFIED
    const pendingDocs = await prisma.stationDocument.count({
      where: { stationId, verificationStatus: "PENDING" },
    });

    const rejectedDocs = await prisma.stationDocument.count({
      where: { stationId, verificationStatus: "REJECTED" },
    });

    // If all documents are reviewed (none pending), update the station's compliance
    if (pendingDocs === 0) {
      const totalDocs = await prisma.stationDocument.count({
        where: { stationId },
      });

      const verifiedDocs = await prisma.stationDocument.count({
        where: { stationId, verificationStatus: "VERIFIED" },
      });

      const complianceScore = totalDocs > 0 ? Math.round((verifiedDocs / totalDocs) * 100) : 0;

      // Update station verification step if all docs verified
      if (rejectedDocs === 0 && verifiedDocs > 0) {
        // All documents verified — mark documents step as passed
        const existingStep = await prisma.stationVerification.findFirst({
          where: { stationId, step: "DOCUMENTS" },
        });

        if (existingStep) {
          await prisma.stationVerification.update({
            where: { id: existingStep.id },
            data: {
              status: "PASSED",
              verifiedById: adminId,
              notes: "All required documents have been verified",
              timestamp: new Date(),
            },
          });
        } else {
          await prisma.stationVerification.create({
            data: {
              stationId,
              step: "DOCUMENTS",
              status: "PASSED",
              verifiedById: adminId,
              notes: "All required documents have been verified",
              timestamp: new Date(),
            },
          });
        }

        await prisma.verificationLog.create({
          data: {
            stationId,
            action: "STEP_PASSED",
            performedById: adminId,
            details: JSON.stringify({
              step: "DOCUMENTS",
              verifiedDocs,
              totalDocs,
            }),
          },
        });
      }

      // Update station compliance score and onboarding step
      const currentStation = await prisma.station.findUnique({
        where: { id: stationId },
        select: { onboardingStep: true },
      });

      const newOnboardingStep = rejectedDocs > 0
        ? 1
        : Math.max(2, currentStation?.onboardingStep || 0);

      await prisma.station.update({
        where: { id: stationId },
        data: {
          complianceScore,
          lastComplianceCheck: new Date(),
          onboardingStep: newOnboardingStep,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedDocument,
      message: `Document ${action === "APPROVE" ? "approved" : "rejected"} successfully`,
    });
  } catch (error) {
    console.error("Admin review action error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process review action" },
      { status: 500 }
    );
  }
}
