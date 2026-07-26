"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  FileText,
  FileImage,
  File,
  Upload,
  Trash2,
  Eye,
  Loader2,
  Plus,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldAlert,
  HelpCircle,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DOCUMENT_TYPE_LABELS, getDocumentTypeLabel, getDocumentValidityMonths, normalizeDocumentType } from "@/lib/constants";

// ─── Types ───────────────────────────────────────────

interface Document {
  id: string;
  stationId: string;
  type: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  expiryDate?: string | null;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED";
  rejectionReason?: string;
  rejectedAt?: string | null;
  resubmitAvailableAt?: string | null;
  permitNumber?: string | null;
  issuingAuthority?: string | null;
  issueDate?: string | null;
  uploadedAt: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".pdf"];

// ─── Helpers ────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getFileIcon(fileName: string) {
  if (fileName.endsWith(".pdf"))
    return <FileText className="h-5 w-5 text-red-500" />;
  if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i))
    return <FileImage className="h-5 w-5 text-blue-500" />;
  return <File className="h-5 w-5 text-slate-400" />;
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    PENDING:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    VERIFIED:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    REJECTED:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    EXPIRED:
      "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400",
  };
  return (
    <Badge variant="outline" className={`${styles[status]} font-medium`}>
      {status}
    </Badge>
  );
}

/** Format a countdown from seconds to HH:MM:SS */
function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":");
}

/** Check if a rejected document is still in cooldown */
function isInCooldown(doc: Document): boolean {
  if (doc.verificationStatus !== "REJECTED") return false;
  if (!doc.resubmitAvailableAt) return false;
  return new Date(doc.resubmitAvailableAt).getTime() > Date.now();
}

/** Get remaining seconds until resubmission is available */
function getCooldownSeconds(doc: Document): number {
  if (!doc.resubmitAvailableAt) return 0;
  const remaining =
    Math.ceil(
      (new Date(doc.resubmitAvailableAt).getTime() - Date.now()) / 1000
    );
  return Math.max(0, remaining);
}

function getChecklistStatus(doc: Document | undefined) {
  if (!doc) {
    return {
      icon: <HelpCircle className="h-5 w-5 text-slate-300" />,
      badge: (
        <Badge variant="outline" className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 font-medium">
          Not submitted
        </Badge>
      ),
      label: "Not yet uploaded",
    };
  }
  switch (doc.verificationStatus) {
    case "VERIFIED":
      return {
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        badge: (
          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 font-medium">
            Verified
          </Badge>
        ),
        label: doc.fileName,
      };
    case "PENDING":
      return {
        icon: <Clock className="h-5 w-5 text-amber-500" />,
        badge: (
          <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
            Pending review
          </Badge>
        ),
        label: doc.fileName,
      };
    case "REJECTED":
      if (isInCooldown(doc)) {
        return {
          icon: <Timer className="h-5 w-5 text-orange-500" />,
          badge: (
            <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 font-medium">
              Resubmit in: {formatCountdown(getCooldownSeconds(doc))}
            </Badge>
          ),
          label: doc.rejectionReason ? `Rejected: ${doc.rejectionReason}` : doc.fileName,
        };
      }
      return {
        icon: <XCircle className="h-5 w-5 text-red-500" />,
        badge: (
          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 font-medium">
            Ready to resubmit
          </Badge>
        ),
        label: doc.rejectionReason ? `Rejected: ${doc.rejectionReason}` : doc.fileName,
      };
    case "EXPIRED":
      return {
        icon: <ShieldAlert className="h-5 w-5 text-slate-500" />,
        badge: (
          <Badge variant="outline" className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400 font-medium">
            Expired
          </Badge>
        ),
        label: doc.fileName,
      };
    default:
      return {
        icon: <HelpCircle className="h-5 w-5 text-slate-300" />,
        badge: (
          <Badge variant="outline" className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 font-medium">
            Unknown
          </Badge>
        ),
        label: doc.fileName,
      };
  }
}

// ─── Skeleton ───────────────────────────────────────

function DocumentsSkeleton() {
  return (
    <div className="space-y-8">
      {/* Summary cards skeleton */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border shadow-sm">
            <CardContent className="p-4 text-center">
              <Skeleton className="h-8 w-12 mx-auto mb-2" />
              <Skeleton className="h-3 w-20 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Checklist skeleton */}
      <div>
        <Skeleton className="h-6 w-56 mb-4" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(13)].map((_, i) => (
            <Card key={i} className="border shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                </div>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Table skeleton */}
      <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                {[...Array(5)].map((_, i) => (
                  <TableHead key={i}>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(5)].map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────

export default function DashboardDocumentsPage() {
  const { data: session, status: sessionStatus } = useSession();

  // State
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload dialog
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Upload metadata fields
  const [uploadPermitNumber, setUploadPermitNumber] = useState("");
  const [uploadIssuingAuthority, setUploadIssuingAuthority] = useState("");
  const [uploadIssueDate, setUploadIssueDate] = useState("");

  // View document detail dialog
  const [viewDocument, setViewDocument] = useState<Document | null>(null);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Countdown ticker — force re-render every second for live countdowns
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // ─── Fetch documents ───────────────────────────────

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/station/documents");
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to fetch documents");
      }
      setDocuments(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (session) fetchDocuments();
  }, [session, sessionStatus, fetchDocuments]);

  // ─── Upload handler ────────────────────────────────

  const handleUpload = async () => {
    setUploadError(null);
    if (!uploadFile) {
      setUploadError("Please select a file");
      return;
    }
    if (!uploadType) {
      setUploadError("Please select a document type");
      return;
    }
    if (!uploadPermitNumber.trim()) {
      setUploadError("Permit / Certificate Number is required");
      return;
    }
    if (!uploadIssuingAuthority.trim()) {
      setUploadError("Issuing Authority is required");
      return;
    }
    if (!uploadIssueDate) {
      setUploadError("Issue Date is required");
      return;
    }

    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("type", uploadType);
      fd.append("permitNumber", uploadPermitNumber.trim());
      fd.append("issuingAuthority", uploadIssuingAuthority.trim());
      fd.append("issueDate", new Date(uploadIssueDate).toISOString());

      // Auto-calculate expiry date from validity period
      const validityMonths = getDocumentValidityMonths(uploadType);
      if (validityMonths > 0) {
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + validityMonths);
        fd.append("expiryDate", expiryDate.toISOString());
      }

      const res = await fetch("/api/station/documents/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Upload failed");
      }

      // Reset and close
      setUploadFile(null);
      setUploadType("");
      setUploadPermitNumber("");
      setUploadIssuingAuthority("");
      setUploadIssueDate("");
      setIsUploadOpen(false);
      await fetchDocuments();
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setUploadError("Invalid file type. Only PDF, JPG, and PNG files are allowed.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("File too large. Maximum size is 10MB.");
      return;
    }
    setUploadFile(file);
  };

  // ─── Delete handler ────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/station/documents/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Delete failed");
      }
      setDeleteTarget(null);
      await fetchDocuments();
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Card click handler ────────────────────────────

  const handleCardClick = (docType: string, doc: Document | undefined) => {
    if (doc) {
      // For rejected documents in cooldown: show detail view, not upload
      if (isInCooldown(doc)) {
        setViewDocument(doc);
        return;
      }
      // For rejected documents past cooldown: open upload dialog pre-filled
      if (doc.verificationStatus === "REJECTED") {
        setUploadType(docType);
        setUploadFile(null);
        setUploadPermitNumber(doc.permitNumber || "");
        setUploadIssuingAuthority(doc.issuingAuthority || "");
        setUploadIssueDate(doc.issueDate ? doc.issueDate.split("T")[0] : "");
        setUploadError(null);
        setIsUploadOpen(true);
        return;
      }
      // Show document details for submitted documents
      setViewDocument(doc);
    } else {
      // Open upload dialog with type pre-selected
      setUploadType(docType);
      setUploadFile(null);
      setUploadPermitNumber("");
      setUploadIssuingAuthority("");
      setUploadIssueDate("");
      setUploadError(null);
      setIsUploadOpen(true);
    }
  };

  // ─── Derived data ──────────────────────────────────

  const totalDocs = documents.length;
  const verifiedCount = documents.filter((d) => d.verificationStatus === "VERIFIED").length;
  const pendingCount = documents.filter((d) => d.verificationStatus === "PENDING").length;
  const rejectedExpiredCount = documents.filter(
    (d) => d.verificationStatus === "REJECTED" || d.verificationStatus === "EXPIRED"
  ).length;

  const documentMap = new Map<string, Document>();
  for (const doc of documents) {
    const normalized = normalizeDocumentType(doc.type);
    documentMap.set(normalized, doc); // Last occurrence wins (most recent upload per category)
  }

  // ─── Loading state ─────────────────────────────────

  if (isLoading || sessionStatus === "loading") {
    return <DocumentsSkeleton />;
  }

  // ─── Error state ───────────────────────────────────

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-red-400 mx-auto" />
          <p className="text-slate-600 dark:text-slate-400">{error}</p>
          <Button variant="outline" onClick={fetchDocuments} className="rounded-xl">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Documents
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Upload and manage your station&apos;s compliance documents
          </p>
        </div>
        <Button
          className="rounded-xl"
          onClick={() => {
            setUploadType("");
            setUploadFile(null);
            setUploadPermitNumber("");
            setUploadIssuingAuthority("");
            setUploadIssueDate("");
            setUploadError(null);
            setIsUploadOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Upload Document
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Documents",
            value: totalDocs,
            color:
              "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700",
          },
          {
            label: "Verified",
            value: verifiedCount,
            color:
              "bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/50",
          },
          {
            label: "Pending",
            value: pendingCount,
            color:
              "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50",
          },
          {
            label: "Rejected / Expired",
            value: rejectedExpiredCount,
            color:
              "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/50",
          },
        ].map((stat) => (
          <Card key={stat.label} className={`${stat.color} border shadow-sm`}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {stat.value}
              </p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Required Documents Checklist */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Required Documents
        </h3>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, info]) => {
            const doc = documentMap.get(key);
            const status = getChecklistStatus(doc);
            // Determine expiry warning
            const validityMonths = info.validityMonths;
            const hasExpiryWarning = doc && validityMonths > 0 && doc.verificationStatus === "VERIFIED" && doc.expiryDate;
            const now = new Date();
            const expiryDate = doc?.expiryDate ? new Date(doc.expiryDate) : null;
            const daysUntilExpiry = expiryDate ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
            const isExpiringSoon = hasExpiryWarning && daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;
            const isExpired = hasExpiryWarning && daysUntilExpiry !== null && daysUntilExpiry <= 0;
            const inCooldown = doc ? isInCooldown(doc) : false;
            return (
              <Card
                key={key}
                className={`border shadow-sm transition-colors cursor-pointer hover:shadow-md hover:scale-[1.02] transition-transform ${
                  !doc
                    ? "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700"
                    : isExpired
                    ? "bg-red-50/50 dark:bg-red-900/10 border-red-300 dark:border-red-700/60"
                    : isExpiringSoon
                    ? "bg-amber-50/50 dark:bg-amber-900/10 border-amber-300 dark:border-amber-700/60"
                    : inCooldown
                    ? "bg-orange-50/50 dark:bg-orange-900/10 border-orange-300 dark:border-orange-700/60"
                    : doc.verificationStatus === "VERIFIED"
                    ? "bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800/40"
                    : doc.verificationStatus === "REJECTED" || doc.verificationStatus === "EXPIRED"
                    ? "bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800/40"
                    : "bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/40"
                }`}
                onClick={() => handleCardClick(key, doc)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">{status.icon}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white leading-tight">
                        {info.label}
                      </p>
                      <p
                        className={`text-xs mt-1 truncate ${
                          !doc
                            ? "text-slate-400 dark:text-slate-500 italic"
                            : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {status.label}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {status.badge}
                      {isExpired && (
                        <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium text-xs border-red-200">
                          Expired {daysUntilExpiry !== null ? `${Math.abs(daysUntilExpiry)}d ago` : ""}
                        </Badge>
                      )}
                      {isExpiringSoon && (
                        <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium text-xs border-amber-200">
                          Expiring in {daysUntilExpiry}d
                        </Badge>
                      )}
                    </div>
                    {doc && (
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {formatDate(doc.uploadedAt)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Documents Table */}
      <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                <TableHead className="font-bold text-xs uppercase tracking-wider">
                  Document Type
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">
                  File Name
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider hidden md:table-cell">
                  Upload Date
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-12 text-slate-500"
                  >
                    <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium">No documents uploaded yet</p>
                    <p className="text-sm text-slate-400 mt-1">
                      Upload your first document to start the verification
                      process.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => {
                  const inCooldown = isInCooldown(doc);
                  const cooldownSecs = inCooldown ? getCooldownSeconds(doc) : 0;
                  return (
                    <TableRow
                      key={doc.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                    >
                      <TableCell>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {getDocumentTypeLabel(doc.type)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getFileIcon(doc.fileName)}
                          <span className="text-sm text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                            {doc.fileName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(doc.uploadedAt)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(doc.verificationStatus)}
                          {inCooldown && (
                            <span className="text-xs text-orange-600 dark:text-orange-400 font-mono flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              {formatCountdown(cooldownSecs)}
                            </span>
                          )}
                          {doc.verificationStatus === "REJECTED" && !inCooldown && (
                            <span className="text-xs text-green-600 dark:text-green-400">
                              Ready to resubmit
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="min-h-[36px] min-w-[36px]"
                            onClick={() =>
                              window.open(doc.fileUrl, "_blank")
                            }
                            title="View document"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="min-h-[36px] min-w-[36px] text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => setDeleteTarget(doc)}
                            title="Delete document"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Upload Dialog */}
      <Dialog
        open={isUploadOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsUploadOpen(false);
            setUploadFile(null);
            setUploadType("");
            setUploadPermitNumber("");
            setUploadIssuingAuthority("");
            setUploadIssueDate("");
            setUploadError(null);
          }
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" /> Upload Document
            </DialogTitle>
            <DialogDescription>
              Upload a compliance document for your water station. Accepted
              formats: PDF, JPG, PNG (max 10MB).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Document Type */}
            <div className="space-y-2">
              <Label htmlFor="doc-type">Document Type</Label>
              <Select value={uploadType} onValueChange={setUploadType}>
                <SelectTrigger id="doc-type" className="rounded-xl">
                  <SelectValue placeholder="Select document type..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, info]) => (
                    <SelectItem key={key} value={key}>
                      {info.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Permit / Certificate Number */}
            <div className="space-y-2">
              <Label htmlFor="permit-number">
                Permit / Certificate Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="permit-number"
                type="text"
                placeholder="e.g., 2024-DTI-123456"
                value={uploadPermitNumber}
                onChange={(e) => setUploadPermitNumber(e.target.value)}
                className="rounded-xl"
              />
            </div>

            {/* Issuing Authority */}
            <div className="space-y-2">
              <Label htmlFor="issuing-authority">
                Issuing Authority <span className="text-red-500">*</span>
              </Label>
              <Input
                id="issuing-authority"
                type="text"
                placeholder="e.g., DTI Region VII, LGU Tagbilaran"
                value={uploadIssuingAuthority}
                onChange={(e) => setUploadIssuingAuthority(e.target.value)}
                className="rounded-xl"
              />
            </div>

            {/* Issue Date */}
            <div className="space-y-2">
              <Label htmlFor="issue-date">
                Issue Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="issue-date"
                type="date"
                value={uploadIssueDate}
                onChange={(e) => setUploadIssueDate(e.target.value)}
                className="rounded-xl"
              />
            </div>

            {/* Expiry Date (auto-calculated, read-only display) */}
            {uploadType && getDocumentValidityMonths(uploadType) > 0 && (
              <div className="space-y-2">
                <Label>Expiry Date (auto-calculated)</Label>
                <p className="text-sm text-slate-500 dark:text-slate-400 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  {(() => {
                    const d = new Date();
                    d.setMonth(d.getMonth() + getDocumentValidityMonths(uploadType));
                    return d.toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                  })()}
                </p>
              </div>
            )}

            {/* File Picker */}
            <div className="space-y-2">
              <Label htmlFor="doc-file">File</Label>
              <Input
                id="doc-file"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileChange}
                className="rounded-xl cursor-pointer file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400"
              />
              {uploadFile && (
                <p className="text-xs text-slate-500">
                  Selected: {uploadFile.name} ({formatFileSize(uploadFile.size)})
                </p>
              )}
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {uploadError}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsUploadOpen(false);
                setUploadFile(null);
                setUploadType("");
                setUploadPermitNumber("");
                setUploadIssuingAuthority("");
                setUploadIssueDate("");
                setUploadError(null);
              }}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={isUploading || !uploadFile || !uploadType}
              className="rounded-xl"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" /> Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" /> Delete Document
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this document? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteTarget && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                {getFileIcon(deleteTarget.fileName)}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {deleteTarget.fileName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {getDocumentTypeLabel(deleteTarget.type)} 
                    • {formatFileSize(deleteTarget.fileSize)}
                  </p>
                </div>
              </div>
              {deleteError && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {deleteError}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteError(null);
              }}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-xl"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Document Detail Dialog */}
      <Dialog
        open={!!viewDocument}
        onOpenChange={(open) => {
          if (!open) setViewDocument(null);
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Document Details
            </DialogTitle>
            <DialogDescription>
              View information about this submitted document.
            </DialogDescription>
          </DialogHeader>

          {viewDocument && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {getDocumentTypeLabel(viewDocument.type)}
                </p>
              </div>

              <div className="space-y-2">
                <Label>File Name</Label>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  {getFileIcon(viewDocument.fileName)}
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {viewDocument.fileName}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">File Size</Label>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {formatFileSize(viewDocument.fileSize)}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Uploaded</Label>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {formatDate(viewDocument.uploadedAt)}
                  </p>
                </div>
              </div>

              {/* Metadata fields */}
              {viewDocument.permitNumber && (
                <div className="space-y-1">
                  <Label className="text-xs">Permit / Certificate Number</Label>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {viewDocument.permitNumber}
                  </p>
                </div>
              )}

              {viewDocument.issuingAuthority && (
                <div className="space-y-1">
                  <Label className="text-xs">Issuing Authority</Label>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {viewDocument.issuingAuthority}
                  </p>
                </div>
              )}

              {viewDocument.issueDate && (
                <div className="space-y-1">
                  <Label className="text-xs">Issue Date</Label>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {formatDateOnly(viewDocument.issueDate)}
                  </p>
                </div>
              )}

              {viewDocument.expiryDate && (
                <div className="space-y-1">
                  <Label className="text-xs">Expiry Date</Label>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {formatDateOnly(viewDocument.expiryDate)}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs">Verification Status</Label>
                <div>{getStatusBadge(viewDocument.verificationStatus)}</div>
                {viewDocument.rejectionReason && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    Reason: {viewDocument.rejectionReason}
                  </p>
                )}
              </div>

              {/* Resubmission cooldown for rejected documents */}
              {viewDocument.verificationStatus === "REJECTED" && isInCooldown(viewDocument) && (
                <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700/50">
                  <p className="text-sm text-orange-700 dark:text-orange-400 flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    Resubmission available in: {formatCountdown(getCooldownSeconds(viewDocument))}
                  </p>
                </div>
              )}

              {viewDocument.verificationStatus === "REJECTED" && !isInCooldown(viewDocument) && (
                <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50">
                  <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Resubmission window is now open
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setViewDocument(null)}
              className="rounded-xl"
            >
              Close
            </Button>
            {viewDocument && (
              <>
                <Button
                  onClick={() => window.open(viewDocument.fileUrl, "_blank")}
                  className="rounded-xl"
                >
                  <Eye className="h-4 w-4 mr-2" /> View File
                </Button>
                {viewDocument.verificationStatus === "REJECTED" && !isInCooldown(viewDocument) && (
                  <Button
                    onClick={() => {
                      const docType = viewDocument.type;
                      setViewDocument(null);
                      setUploadType(docType);
                      setUploadFile(null);
                      setUploadPermitNumber(viewDocument.permitNumber || "");
                      setUploadIssuingAuthority(viewDocument.issuingAuthority || "");
                      setUploadIssueDate(viewDocument.issueDate ? viewDocument.issueDate.split("T")[0] : "");
                      setUploadError(null);
                      setIsUploadOpen(true);
                    }}
                    className="rounded-xl bg-green-600 hover:bg-green-700"
                  >
                    <Upload className="h-4 w-4 mr-2" /> Resubmit Now
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
