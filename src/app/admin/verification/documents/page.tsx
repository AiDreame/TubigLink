"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  FileImage,
  File,
  FileSpreadsheet,
  Clock,
  User,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Document {
  id: string;
  stationId: string;
  stationName: string;
  type: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  status: "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED";
  reviewedBy?: string;
}

const DOC_TYPES = [
  "DTI/SEC Certificate",
  "Barangay Clearance",
  "Sanitary Permit",
  "Water Quality Test (Bacteriological)",
  "Water Quality Test (Physical-Chemical)",
  "Mayor's Permit",
  "BIR 2303",
  "Fire Safety Certificate",
  "Proof of Address",
  "Government ID",
  "Station Photo",
  "Video Walkthrough",
];

export default function AdminVerificationDocumentsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session || (session.user as any)?.role !== "ADMIN") {
      router.push("/auth/login?callbackUrl=/admin/verification/documents");
      return;
    }
    setIsLoading(false);
  }, [session, sessionStatus, router]);

  const [documents, setDocuments] = useState<Document[]>([
    { id: "DOC-001", stationId: "ST-001", stationName: "AquaPure Makati", type: "DTI/SEC Certificate", fileName: "dti_cert_aquapure.pdf", fileSize: "2.4 MB", uploadedAt: "2026-07-10T08:30:00", status: "PENDING" },
    { id: "DOC-002", stationId: "ST-001", stationName: "AquaPure Makati", type: "Barangay Clearance", fileName: "brgy_clearance.pdf", fileSize: "1.1 MB", uploadedAt: "2026-07-10T08:35:00", status: "VERIFIED", reviewedBy: "Admin" },
    { id: "DOC-003", stationId: "ST-002", stationName: "Healthy Drops BGC", type: "Sanitary Permit", fileName: "sanitary_permit.pdf", fileSize: "3.2 MB", uploadedAt: "2026-07-09T14:00:00", status: "PENDING" },
    { id: "DOC-004", stationId: "ST-002", stationName: "Healthy Drops BGC", type: "Mayor's Permit", fileName: "mayors_permit.jpg", fileSize: "1.8 MB", uploadedAt: "2026-07-09T14:05:00", status: "REJECTED" },
    { id: "DOC-005", stationId: "ST-003", stationName: "Clear Water QC", type: "Water Quality Test (Bacteriological)", fileName: "water_test_bact.pdf", fileSize: "4.5 MB", uploadedAt: "2026-07-08T10:00:00", status: "VERIFIED", reviewedBy: "Admin" },
    { id: "DOC-006", stationId: "ST-003", stationName: "Clear Water QC", type: "Government ID", fileName: "govt_id_santi.png", fileSize: "0.8 MB", uploadedAt: "2026-07-08T10:10:00", status: "VERIFIED", reviewedBy: "Admin" },
    { id: "DOC-007", stationId: "ST-005", stationName: "Davao Pure Water", type: "DTI/SEC Certificate", fileName: "dti_cert_davao.pdf", fileSize: "2.1 MB", uploadedAt: "2026-07-06T16:00:00", status: "EXPIRED" },
    { id: "DOC-008", stationId: "ST-006", stationName: "Cebu H2O Station", type: "Station Photo", fileName: "station_photo.jpg", fileSize: "5.2 MB", uploadedAt: "2026-07-11T07:00:00", status: "PENDING" },
    { id: "DOC-009", stationId: "ST-006", stationName: "Cebu H2O Station", type: "Water Quality Test (Physical-Chemical)", fileName: "water_test_chem.pdf", fileSize: "3.7 MB", uploadedAt: "2026-07-11T07:05:00", status: "PENDING" },
  ]);

  const handleVerify = async (docId: string) => {
    setActionLoading(docId);
    await new Promise((r) => setTimeout(r, 800));
    setDocuments((prev) => prev.map((d) => d.id === docId ? { ...d, status: "VERIFIED" as const, reviewedBy: "Admin" } : d));
    setActionLoading(null);
    if (selectedDoc?.id === docId) setSelectedDoc((prev) => prev ? { ...prev, status: "VERIFIED", reviewedBy: "Admin" } : null);
  };

  const handleReject = async (docId: string) => {
    if (!rejectionReason && selectedDoc?.id === docId) return;
    setActionLoading(docId);
    await new Promise((r) => setTimeout(r, 800));
    setDocuments((prev) => prev.map((d) => d.id === docId ? { ...d, status: "REJECTED" as const } : d));
    setActionLoading(null);
    setRejectionReason("");
    if (selectedDoc?.id === docId) setSelectedDoc((prev) => prev ? { ...prev, status: "REJECTED" } : null);
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith(".pdf")) return <FileText className="h-5 w-5 text-red-500" />;
    if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return <FileImage className="h-5 w-5 text-blue-500" />;
    if (fileName.match(/\.(xlsx|xls|csv)$/i)) return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
    return <File className="h-5 w-5 text-slate-400" />;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      VERIFIED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      EXPIRED: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400",
    };
    return <Badge variant="outline" className={`${styles[status]} font-medium`}>{status}</Badge>;
  };

  const filteredDocs = documents.filter((d) => {
    const matchesSearch = searchTerm === "" ||
      d.stationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "ALL" || d.type === typeFilter;
    const matchesStatus = statusFilter === "ALL" || d.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (isLoading || sessionStatus === "loading") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm text-slate-500">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Document Review
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Review uploaded documents from water station applications
          </p>
        </div>
        <Button variant="outline" className="rounded-xl">
          <Download className="h-4 w-4 mr-2" /> Export
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Documents", value: documents.length, color: "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700" },
          { label: "Pending Review", value: documents.filter((d) => d.status === "PENDING").length, color: "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50" },
          { label: "Verified", value: documents.filter((d) => d.status === "VERIFIED").length, color: "bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/50" },
          { label: "Rejected/Expired", value: documents.filter((d) => d.status === "REJECTED" || d.status === "EXPIRED").length, color: "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/50" },
        ].map((stat) => (
          <Card key={stat.label} className={`${stat.color} border shadow-sm`}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl bg-white dark:bg-gray-800/50"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="rounded-xl min-w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              {typeFilter === "ALL" ? "All Types" : typeFilter.length > 20 ? typeFilter.substring(0, 20) + "..." : typeFilter}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 max-h-60 overflow-y-auto">
            <DropdownMenuItem onClick={() => setTypeFilter("ALL")}>All Types</DropdownMenuItem>
            <DropdownMenuSeparator />
            {DOC_TYPES.map((t) => (
              <DropdownMenuItem key={t} onClick={() => setTypeFilter(t)}>{t}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="rounded-xl min-w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              {statusFilter === "ALL" ? "All Status" : statusFilter}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setStatusFilter("ALL")}>All Status</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setStatusFilter("PENDING")}>Pending</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("VERIFIED")}>Verified</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("REJECTED")}>Rejected</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("EXPIRED")}>Expired</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Documents Table */}
      <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                <TableHead className="font-bold text-xs uppercase tracking-wider">Document</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider hidden md:table-cell">Station</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Type</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider hidden lg:table-cell">Size</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider hidden lg:table-cell">Uploaded</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p>No documents found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocs.map((doc) => (
                  <TableRow key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer"
                    onClick={() => setSelectedDoc(doc)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getFileIcon(doc.fileName)}
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{doc.fileName}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p className="text-sm text-slate-700 dark:text-slate-300">{doc.stationName}</p>
                    </TableCell>
                    <TableCell><p className="text-sm text-slate-600 dark:text-slate-400">{doc.type}</p></TableCell>
                    <TableCell className="hidden lg:table-cell"><p className="text-sm text-slate-500">{doc.fileSize}</p></TableCell>
                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    <TableCell className="hidden lg:table-cell"><p className="text-xs text-slate-500">{formatDate(doc.uploadedAt)}</p></TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" className="min-h-[36px] min-w-[36px]"
                          onClick={() => setSelectedDoc(doc)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {doc.status === "PENDING" && (
                          <Button variant="ghost" size="sm" className="min-h-[36px] min-w-[36px] text-green-600"
                            onClick={() => handleVerify(doc.id)}
                            disabled={actionLoading === doc.id}>
                            {actionLoading === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Document Detail Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={(open) => { if (!open) { setSelectedDoc(null); setRejectionReason(""); }}}>
        <DialogContent className="max-w-lg">
          {selectedDoc && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  {getFileIcon(selectedDoc.fileName)}
                  <div>
                    <DialogTitle className="text-lg">{selectedDoc.fileName}</DialogTitle>
                    <DialogDescription>{selectedDoc.type} • {selectedDoc.stationName}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedDoc.status)}</div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">File Size</p>
                    <p className="text-sm mt-1">{selectedDoc.fileSize}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Uploaded</p>
                    <p className="text-sm mt-1 flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDate(selectedDoc.uploadedAt)}</p>
                  </div>
                  {selectedDoc.reviewedBy && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reviewed By</p>
                      <p className="text-sm mt-1 flex items-center gap-1"><User className="h-3 w-3" /> {selectedDoc.reviewedBy}</p>
                    </div>
                  )}
                </div>

                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
                  <FileText className="h-12 w-12 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">Document preview</p>
                  <Button variant="outline" size="sm" className="mt-3 rounded-lg">
                    <Eye className="h-4 w-4 mr-2" /> View Full Document
                  </Button>
                </div>

                {selectedDoc.status === "REJECTED" && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">Rejection Reason</p>
                    <p className="text-sm text-red-600 dark:text-red-300 mt-1">Document is blurry and unreadable. Please re-upload a clearer copy.</p>
                  </div>
                )}

                {selectedDoc.status === "PENDING" && (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Optional: Add notes or rejection reason..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={3}
                      className="rounded-xl"
                    />
                    <div className="flex gap-2">
                      <Button className="flex-1 rounded-xl bg-green-600 hover:bg-green-700"
                        onClick={() => handleVerify(selectedDoc.id)}
                        disabled={actionLoading === selectedDoc.id}>
                        {actionLoading === selectedDoc.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                        Verify & Approve
                      </Button>
                      <Button variant="outline" className="flex-1 rounded-xl text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                        onClick={() => handleReject(selectedDoc.id)}
                        disabled={actionLoading === selectedDoc.id || !rejectionReason}>
                        {actionLoading === selectedDoc.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                        {rejectionReason ? "Reject" : "Add reason to reject"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}