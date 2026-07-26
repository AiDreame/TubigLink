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

    if (!["APPROVE", "REJECT", "REVERT"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be APPROVE, REJECT, or REVERT" },
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

    // REVERT can be applied to VERIFIED or REJECTED documents
    if (action === "REVERT") {
      if (document.verificationStatus === "PENDING") {
        return NextResponse.json(
          { error: "Document is already pending. Nothing to revert." },
          { status: 400 }
        );
      }
    } else {
      // APPROVE/REJECT can only apply to PENDING documents
      if (document.verificationStatus !== "PENDING") {
        return NextResponse.json(
          { error: `Document has already been ${document.verificationStatus.toLowerCase()}. Cannot review again.` },
          { status: 400 }
        );
      }
    }

    // Update document verification status
    const newStatus = action === "REVERT" ? "PENDING" : action === "APPROVE" ? "VERIFIED" : "REJECTED";

    // Calculate resubmission cooldown (24 hours after rejection)
    const now = new Date();
    const resubmitAvailableAt = action === "REJECT"
      ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
      : action === "REVERT" ? null : undefined;

    const updatedDocument = await prisma.stationDocument.update({
      where: { id: documentId },
      data: {
        verificationStatus: newStatus,
        rejectionReason: action === "REVERT" ? null : action === "REJECT" ? rejectionReason : null,
        verifiedById: action === "REVERT" ? null : adminId,
        verifiedAt: action === "REVERT" ? null : new Date(),
        rejectedAt: action === "REJECT" ? now : action === "REVERT" ? null : undefined,
        resubmitAvailableAt: resubmitAvailableAt as Date | null | undefined,
      },
    });

    // Create verification log entry
    const logActionMap: Record<string, string> = {
      APPROVE: "DOCUMENT_VERIFIED",
      REJECT: "DOCUMENT_REJECTED",
      REVERT: "DOCUMENT_REJECTED", // reused action type for audit trail
    };
    await prisma.verificationLog.create({
      data: {
        stationId,
        action: logActionMap[action],
        performedById: adminId,
        details: JSON.stringify({
          documentId,
          documentType: document.type,
          fileName: document.fileName,
          newStatus,
          previousStatus: document.verificationStatus,
          rejectionReason: action === "REJECT" ? rejectionReason : action === "REVERT" ? "Reverted to pending by admin" : null,
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

    const messageMap: Record<string, string> = {
      APPROVE: "Document approved successfully",
      REJECT: "Document rejected successfully",
      REVERT: "Document reverted to pending successfully",
    };
    return NextResponse.json({
      success: true,
      data: updatedDocument,
      message: messageMap[action],
    });
  } catch (error) {
    console.error("Admin review action error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process review action" },
      { status: 500 }
    );
  }
}
