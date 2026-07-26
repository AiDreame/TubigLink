"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  FileText,
  Store,
  User,
  Phone,
  MapPin,
  Shield,
  ChevronDown,
  Eye,
  Download,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDocumentTypeLabel } from "@/lib/constants";
import { getStationVerificationLabel } from "@/lib/provisional";

// ─── Types ───────────────────────────────────────────

interface StationDoc {
  id: string;
  type: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  verificationStatus: string;
  rejectionReason?: string;
  expiryDate?: string;
  uploadedAt: string;
}

interface StationDetail {
  id: string;
  name: string;
  address: string;
  barangay: string;
  city: string;
  province: string;
  businessType?: string;
  tin?: string;
  onboardingStep: number;
  onboardingSubmittedAt?: string;
  complianceScore: number;
  onboardingComplete: boolean;
  approvedAt?: string;
  rejectionReason?: string;
  provisionalUntil?: string;
  isActive: boolean;
  user: { name?: string; phone?: string; email?: string };
  documents: StationDoc[];
  documentSummary: {
    total: number;
    pending: number;
    verified: number;
    rejected: number;
    expired: number;
  };
  verificationLabel: string;
}

interface QueueStation {
  id: string;
  name: string;
  city: string;
  onboardingStep: number;
  onboardingSubmittedAt?: string;
  complianceScore: number;
  onboardingComplete: boolean;
  approvedAt?: string;
  rejectionReason?: string;
  provisionalUntil?: string;
  isActive: boolean;
  user: { name?: string; phone?: string; email?: string };
  documentSummary: {
    total: number;
    pending: number;
    verified: number;
    rejected: number;
    expired: number;
  };
}

// ─── Component ────────────────────────────────────────

export default function AdminVerificationPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedStation, setSelectedStation] = useState<StationDetail | null>(null);
  const [stationDetailLoading, setStationDetailLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [stations, setStations] = useState<QueueStation[]>([]);

  // Check admin role
  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session || (session.user as any)?.role !== "ADMIN") {
      router.push("/auth/login?callbackUrl=/admin/verification");
      return;
    }
  }, [session, sessionStatus, router]);

  // Fetch stations from queue API
  const fetchStations = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/verification/queue?limit=50");
      const json = await res.json();
      if (json.success) {
        setStations(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch verification queue:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus !== "loading" && session) {
      fetchStations();
    }
  }, [session, sessionStatus, fetchStations]);

  // Fetch station detail when selected
  const openStationDetail = async (station: QueueStation) => {
    setStationDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/verification/${station.id}`);
      const json = await res.json();
      if (json.success) {
        setSelectedStation(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch station detail:", err);
    } finally {
      setStationDetailLoading(false);
    }
  };

  // Map station to status filter category
  const getStationFilterStatus = (s: QueueStation): string => {
    if (s.approvedAt) return "VERIFIED";
    if (s.rejectionReason) return "REJECTED";
    if (s.onboardingSubmittedAt && s.documentSummary.pending > 0) return "PENDING";
    if (s.onboardingSubmittedAt) return "IN_REVIEW";
    return "PENDING";
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { color: string; label: string }> = {
      PENDING: { color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800", label: "Pending" },
      IN_REVIEW: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800", label: "In Review" },
      VERIFIED: { color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800", label: "Verified" },
      REJECTED: { color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800", label: "Rejected" },
      FLAGGED: { color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800", label: "Flagged" },
    };
    const s = styles[status] || styles.PENDING;
    return <Badge variant="outline" className={`${s.color} font-medium`}>{s.label}</Badge>;
  };

  const getDocStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      VERIFIED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      EXPIRED: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400",
    };
    return <Badge variant="outline" className={`${styles[status] || styles.PENDING} font-medium`}>{status}</Badge>;
  };

  const filteredStations = stations.filter((s) => {
    const matchesSearch = searchTerm === "" ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.user?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase());
    const sStatus = getStationFilterStatus(s);
    const matchesStatus = statusFilter === "ALL" || sStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const counts = {
    PENDING: stations.filter((s) => getStationFilterStatus(s) === "PENDING").length,
    IN_REVIEW: stations.filter((s) => getStationFilterStatus(s) === "IN_REVIEW").length,
    VERIFIED: stations.filter((s) => getStationFilterStatus(s) === "VERIFIED").length,
    REJECTED: stations.filter((s) => getStationFilterStatus(s) === "REJECTED").length,
    FLAGGED: stations.filter((s) => getStationFilterStatus(s) === "FLAGGED").length,
  };

  const handleApprove = async (stationId: string) => {
    setActionLoading(stationId);
    try {
      const res = await fetch("/api/admin/verification/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stationId }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchStations();
        if (selectedStation?.id === stationId) {
          openStationDetail({ id: stationId } as any);
        }
      }
    } catch (err) {
      console.error("Approve error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (stationId: string, reason?: string) => {
    setActionLoading(stationId);
    try {
      const res = await fetch("/api/admin/verification/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stationId, rejectionReason: reason || "Rejected by admin" }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchStations();
        if (selectedStation?.id === stationId) {
          openStationDetail({ id: stationId } as any);
        }
      }
    } catch (err) {
      console.error("Reject error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleGrantProvisional = async (stationId: string) => {
    setActionLoading(stationId);
    try {
      const res = await fetch("/api/admin/verification/provisional", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stationId }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchStations();
        if (selectedStation?.id === stationId) {
          openStationDetail({ id: stationId } as any);
        }
      }
    } catch (err) {
      console.error("Provisional error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (isLoading || sessionStatus === "loading") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm text-slate-500">Loading verification dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Station Verification
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Review and verify water station applications and documents
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl" onClick={fetchStations}>
            <Download className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card className="bg-white dark:bg-gray-800/50 border-none shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setStatusFilter("ALL")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stations.length}</p>
            <p className="text-xs text-slate-500 mt-1">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setStatusFilter("PENDING")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{counts.PENDING}</p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setStatusFilter("IN_REVIEW")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{counts.IN_REVIEW}</p>
            <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">In Review</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800/50 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setStatusFilter("FLAGGED")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{counts.FLAGGED}</p>
            <p className="text-xs text-purple-600 dark:text-purple-500 mt-1">Flagged</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/50 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setStatusFilter("VERIFIED")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">{counts.VERIFIED}</p>
            <p className="text-xs text-green-600 dark:text-green-500 mt-1">Verified</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by station name, owner, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl bg-white dark:bg-gray-800/50"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="rounded-xl min-w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              {statusFilter === "ALL" ? "All Status" : statusFilter.replace("_", " ")}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setStatusFilter("ALL")}>All Status</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setStatusFilter("PENDING")}>Pending</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("IN_REVIEW")}>In Review</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("VERIFIED")}>Verified</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("REJECTED")}>Rejected</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("FLAGGED")}>Flagged</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Verifications Table */}
      <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                <TableHead className="font-bold text-xs uppercase tracking-wider">Station</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider hidden md:table-cell">Owner</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider hidden lg:table-cell">Location</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider hidden md:table-cell">Compliance</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider hidden lg:table-cell">Submitted</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                    <Shield className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p>No verifications found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStations.map((s) => {
                  const sStatus = getStationFilterStatus(s);
                  return (
                    <TableRow key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer"
                      onClick={() => openStationDetail(s)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
                            {s.name[0]}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-900 dark:text-white">{s.name}</p>
                            <p className="text-xs text-slate-500">{s.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="text-sm text-slate-700 dark:text-slate-300">{s.user?.name || "—"}</p>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <p className="text-sm text-slate-700 dark:text-slate-300">{s.city}</p>
                      </TableCell>
                      <TableCell>{getStatusBadge(sStatus)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="text-sm font-medium">{Math.round(s.complianceScore * 100)}%</p>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <p className="text-xs text-slate-500">{formatDate(s.onboardingSubmittedAt)}</p>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" className="min-h-[36px] min-w-[36px]"
                            onClick={() => openStationDetail(s)}>
                            <Eye className="h-4 w-4" />
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

      {/* Station Detail Dialog */}
      <Dialog open={!!selectedStation} onOpenChange={(open) => !open && setSelectedStation(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {stationDetailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : selectedStation ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg">
                    {selectedStation.name[0]}
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{selectedStation.name}</DialogTitle>
                    <DialogDescription>
                      {selectedStation.id.slice(0, 8)}... • {getStatusBadge(getStationFilterStatus(selectedStation as any))}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="details" className="mt-4">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="documents">Documents ({selectedStation.documentSummary?.total || 0})</TabsTrigger>
                  <TabsTrigger value="compliance">Compliance</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Owner</p>
                      <p className="text-sm flex items-center gap-2"><User className="h-3.5 w-3.5 text-slate-400" /> {selectedStation.user?.name || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</p>
                      <p className="text-sm flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-slate-400" /> {selectedStation.user?.phone || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{selectedStation.user?.email || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Business Type</p>
                      <p className="text-sm">{(selectedStation.businessType || "—").replace("_", " ")}</p>
                    </div>
                    <div className="space-y-1 col-span-2">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Address</p>
                      <p className="text-sm flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-slate-400" /> {selectedStation.address}, {selectedStation.barangay}, {selectedStation.city}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">TIN</p>
                      <p className="text-sm">{selectedStation.tin || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Submitted</p>
                      <p className="text-sm">{formatDate(selectedStation.onboardingSubmittedAt)}</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="documents" className="space-y-3 mt-4">
                  {selectedStation.documents.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">No documents uploaded yet.</p>
                  ) : (
                    selectedStation.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-slate-400" />
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{getDocumentTypeLabel(doc.type)}</p>
                            <p className="text-xs text-slate-500">{doc.fileName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getDocStatusBadge(doc.verificationStatus)}
                          {doc.fileUrl && (
                            <Button variant="ghost" size="sm" className="min-h-[36px] min-w-[36px]"
                              onClick={() => window.open(doc.fileUrl, "_blank")}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="compliance" className="space-y-3 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700 text-center">
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{selectedStation.documentSummary?.total || 0}</p>
                      <p className="text-xs text-slate-500 mt-1">Documents Uploaded</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700 text-center">
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {Math.round((selectedStation.complianceScore || 0) * 100)}%
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Compliance Score</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Verification Status</p>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                      {getStationVerificationLabel({
                        onboardingComplete: selectedStation.onboardingComplete,
                        provisionalUntil: selectedStation.provisionalUntil ? new Date(selectedStation.provisionalUntil) : null,
                        rejectionReason: selectedStation.rejectionReason ?? null,
                        approvedAt: selectedStation.approvedAt ? new Date(selectedStation.approvedAt) : null,
                        isActive: selectedStation.isActive,
                      })}
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="mt-6 flex-col sm:flex-row gap-2">
                {!selectedStation.approvedAt && !selectedStation.rejectionReason && (
                  <>
                    <Button variant="default" className="rounded-xl flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(selectedStation.id)}
                      disabled={actionLoading === selectedStation.id}>
                      {actionLoading === selectedStation.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                      Approve Station
                    </Button>
                    <Button variant="outline" className="rounded-xl flex-1 text-blue-600"
                      onClick={() => handleGrantProvisional(selectedStation.id)}
                      disabled={actionLoading === selectedStation.id}>
                      <Clock className="h-4 w-4 mr-2" /> Grant Provisional
                    </Button>
                    <Button variant="outline" className="rounded-xl flex-1 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                      onClick={() => handleReject(selectedStation.id, "Does not meet requirements")}
                      disabled={actionLoading === selectedStation.id}>
                      <XCircle className="h-4 w-4 mr-2" /> Reject
                    </Button>
                  </>
                )}
                {selectedStation.rejectionReason && (
                  <Button variant="default" className="rounded-xl flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleApprove(selectedStation.id)}
                    disabled={actionLoading === selectedStation.id}>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Re-evaluate & Approve
                  </Button>
                )}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
