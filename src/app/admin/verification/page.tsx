"use client";

import { useState, useEffect } from "react";
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

type VerificationStatus = "PENDING" | "IN_REVIEW" | "VERIFIED" | "REJECTED" | "FLAGGED";

interface StationVerification {
  id: string;
  name: string;
  owner: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  barangay: string;
  status: VerificationStatus;
  submittedAt: string;
  documents: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
  businessType: string;
  tin: string;
}

export default function AdminVerificationPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<VerificationStatus | "ALL">("ALL");
  const [selectedStation, setSelectedStation] = useState<StationVerification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Check admin role
  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session || (session.user as any)?.role !== "ADMIN") {
      router.push("/auth/login?callbackUrl=/admin/verification");
      return;
    }
    setIsLoading(false);
  }, [session, sessionStatus, router]);

  // Placeholder data — will be replaced with fetch calls
  const [verifications, setVerifications] = useState<StationVerification[]>([
    {
      id: "ST-001", name: "AquaPure Makati", owner: "Juan Dela Cruz", phone: "09171234567",
      email: "juan@aquapure.com", address: "123 Rizal St.", city: "Makati", barangay: "Poblacion",
      status: "PENDING", submittedAt: "2026-07-10T08:30:00", documents: 3, priority: "HIGH",
      businessType: "SOLE_PROP", tin: "123-456-789-000",
    },
    {
      id: "ST-002", name: "Healthy Drops BGC", owner: "Maria Clara", phone: "09179876543",
      email: "maria@healthydrops.com", address: "456 5th Ave.", city: "Taguig", barangay: "Bonifacio Global City",
      status: "IN_REVIEW", submittedAt: "2026-07-09T14:00:00", documents: 5, priority: "MEDIUM",
      businessType: "CORPORATION", tin: "987-654-321-000",
    },
    {
      id: "ST-003", name: "Clear Water QC", owner: "Santi Ramos", phone: "09175551234",
      email: "santi@clearwater.com", address: "789 Commonwealth", city: "Quezon City", barangay: "Diliman",
      status: "VERIFIED", submittedAt: "2026-07-08T10:00:00", documents: 4, priority: "LOW",
      businessType: "SOLE_PROP", tin: "456-789-123-000",
    },
    {
      id: "ST-004", name: "Spring Fresh Manila", owner: "Elena Garcia", phone: "09174443333",
      email: "elena@springfresh.com", address: "321 Taft Ave.", city: "Manila", barangay: "Ermita",
      status: "REJECTED", submittedAt: "2026-07-07T09:00:00", documents: 2, priority: "HIGH",
      businessType: "PARTNERSHIP", tin: "789-123-456-000",
    },
    {
      id: "ST-005", name: "Davao Pure Water", owner: "Pedro Santos", phone: "09176667777",
      email: "pedro@davaopure.com", address: "555 Rizal St.", city: "Davao City", barangay: "Ecoland",
      status: "FLAGGED", submittedAt: "2026-07-06T16:00:00", documents: 3, priority: "MEDIUM",
      businessType: "SOLE_PROP", tin: "321-654-987-000",
    },
    {
      id: "ST-006", name: "Cebu H2O Station", owner: "Ana Lim", phone: "09178889999",
      email: "ana@cebuh2o.com", address: "888 Osmeña Blvd", city: "Cebu City", barangay: "Lahug",
      status: "PENDING", submittedAt: "2026-07-11T07:00:00", documents: 2, priority: "HIGH",
      businessType: "COOPERATIVE", tin: "654-321-789-000",
    },
  ]);

  const getStatusBadge = (status: VerificationStatus) => {
    const styles: Record<VerificationStatus, { color: string; label: string }> = {
      PENDING: { color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800", label: "Pending" },
      IN_REVIEW: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800", label: "In Review" },
      VERIFIED: { color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800", label: "Verified" },
      REJECTED: { color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800", label: "Rejected" },
      FLAGGED: { color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800", label: "Flagged" },
    };
    const s = styles[status];
    return <Badge variant="outline" className={`${s.color} font-medium`}>{s.label}</Badge>;
  };

  const getPriorityBadge = (priority: "HIGH" | "MEDIUM" | "LOW") => {
    const styles = {
      HIGH: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      MEDIUM: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      LOW: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
    };
    return <Badge variant="outline" className={`${styles[priority]} text-xs`}>{priority}</Badge>;
  };

  const filteredVerifications = verifications.filter((v) => {
    const matchesSearch = searchTerm === "" ||
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const counts = {
    PENDING: verifications.filter((v) => v.status === "PENDING").length,
    IN_REVIEW: verifications.filter((v) => v.status === "IN_REVIEW").length,
    VERIFIED: verifications.filter((v) => v.status === "VERIFIED").length,
    REJECTED: verifications.filter((v) => v.status === "REJECTED").length,
    FLAGGED: verifications.filter((v) => v.status === "FLAGGED").length,
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    // Placeholder — will be replaced with actual API call
    await new Promise((r) => setTimeout(r, 1000));
    setVerifications((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: "VERIFIED" as VerificationStatus } : v))
    );
    setActionLoading(null);
    if (selectedStation?.id === id) setSelectedStation((prev) => prev ? { ...prev, status: "VERIFIED" } : null);
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    await new Promise((r) => setTimeout(r, 1000));
    setVerifications((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: "REJECTED" as VerificationStatus } : v))
    );
    setActionLoading(null);
    if (selectedStation?.id === id) setSelectedStation((prev) => prev ? { ...prev, status: "REJECTED" } : null);
  };

  const handleFlag = async (id: string) => {
    setActionLoading(id);
    await new Promise((r) => setTimeout(r, 1000));
    setVerifications((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: "FLAGGED" as VerificationStatus } : v))
    );
    setActionLoading(null);
    if (selectedStation?.id === id) setSelectedStation((prev) => prev ? { ...prev, status: "FLAGGED" } : null);
  };

  const handleStartReview = async (id: string) => {
    setActionLoading(id);
    await new Promise((r) => setTimeout(r, 800));
    setVerifications((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: "IN_REVIEW" as VerificationStatus } : v))
    );
    setActionLoading(null);
    if (selectedStation?.id === id) setSelectedStation((prev) => prev ? { ...prev, status: "IN_REVIEW" } : null);
  };

  const formatDate = (dateStr: string) => {
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
          <Button variant="outline" className="rounded-xl" onClick={() => window.location.reload()}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card className="bg-white dark:bg-gray-800/50 border-none shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setStatusFilter("ALL")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{verifications.length}</p>
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
              {statusFilter === "ALL" ? "All Status" : statusFilter.replace(/_/g, " ")}
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
                <TableHead className="font-bold text-xs uppercase tracking-wider hidden md:table-cell">Priority</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider hidden lg:table-cell">Submitted</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVerifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                    <Shield className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p>No verifications found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredVerifications.map((v) => (
                  <TableRow key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer"
                    onClick={() => setSelectedStation(v)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
                          {v.name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-white">{v.name}</p>
                          <p className="text-xs text-slate-500">{v.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p className="text-sm text-slate-700 dark:text-slate-300">{v.owner}</p>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <p className="text-sm text-slate-700 dark:text-slate-300">{v.city}</p>
                    </TableCell>
                    <TableCell>{getStatusBadge(v.status)}</TableCell>
                    <TableCell className="hidden md:table-cell">{getPriorityBadge(v.priority)}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <p className="text-xs text-slate-500">{formatDate(v.submittedAt)}</p>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" className="min-h-[36px] min-w-[36px]"
                          onClick={() => setSelectedStation(v)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {v.status === "PENDING" && (
                          <Button variant="ghost" size="sm" className="min-h-[36px] min-w-[36px] text-blue-600"
                            onClick={() => handleStartReview(v.id)} disabled={actionLoading === v.id}>
                            {actionLoading === v.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
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

      {/* Station Detail Dialog */}
      <Dialog open={!!selectedStation} onOpenChange={(open) => !open && setSelectedStation(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedStation && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg">
                    {selectedStation.name[0]}
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{selectedStation.name}</DialogTitle>
                    <DialogDescription>{selectedStation.id} • {getStatusBadge(selectedStation.status)}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="details" className="mt-4">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="documents">Documents ({selectedStation.documents})</TabsTrigger>
                  <TabsTrigger value="compliance">Compliance</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Owner</p>
                      <p className="text-sm flex items-center gap-2"><User className="h-3.5 w-3.5 text-slate-400" /> {selectedStation.owner}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</p>
                      <p className="text-sm flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-slate-400" /> {selectedStation.phone}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{selectedStation.email}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Business Type</p>
                      <p className="text-sm">{selectedStation.businessType.replace(/_/g, " ")}</p>
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
                      <p className="text-sm">{formatDate(selectedStation.submittedAt)}</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="documents" className="space-y-3 mt-4">
                  {[
                    { name: "DTI/SEC Certificate", status: "UPLOADED", type: "PDF" },
                    { name: "Barangay Clearance", status: selectedStation.status === "VERIFIED" ? "VERIFIED" : "PENDING", type: "PDF" },
                    { name: "Sanitary Permit", status: selectedStation.status === "VERIFIED" ? "VERIFIED" : "UPLOADED", type: "PDF" },
                    { name: "Water Quality Test", status: selectedStation.status === "VERIFIED" ? "VERIFIED" : "PENDING", type: "PDF" },
                  ].map((doc, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-slate-400" />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{doc.name}</p>
                          <p className="text-xs text-slate-500">{doc.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.status === "VERIFIED" ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-none">Verified</Badge>
                        ) : doc.status === "UPLOADED" ? (
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-none">Uploaded</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-none">Pending</Badge>
                        )}
                        <Button variant="ghost" size="sm" className="min-h-[36px] min-w-[36px]">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="compliance" className="space-y-3 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700 text-center">
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{selectedStation.documents}/5</p>
                      <p className="text-xs text-slate-500 mt-1">Documents Uploaded</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700 text-center">
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {selectedStation.status === "VERIFIED" ? "100%" : selectedStation.status === "REJECTED" ? "40%" : "60%"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Compliance Score</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Verification Checklist</p>
                    <div className="mt-2 space-y-2">
                      {[
                        { label: "Business Registration", done: true },
                        { label: "Permits & Licenses", done: selectedStation.status !== "REJECTED" },
                        { label: "Water Quality Test", done: selectedStation.status === "VERIFIED" },
                        { label: "Owner Identity Verified", done: selectedStation.status !== "PENDING" },
                        { label: "Location Verified", done: selectedStation.status === "VERIFIED" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          {item.done ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          )}
                          <span className={item.done ? "text-slate-600 dark:text-slate-400" : "text-slate-500 dark:text-slate-500"}>
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="mt-6 flex-col sm:flex-row gap-2">
                {selectedStation.status === "PENDING" && (
                  <Button variant="outline" className="rounded-xl flex-1"
                    onClick={() => handleStartReview(selectedStation.id)}
                    disabled={actionLoading === selectedStation.id}>
                    {actionLoading === selectedStation.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                    Start Review
                  </Button>
                )}
                {selectedStation.status === "IN_REVIEW" && (
                  <>
                    <Button variant="default" className="rounded-xl flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(selectedStation.id)}
                      disabled={actionLoading === selectedStation.id}>
                      {actionLoading === selectedStation.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                      Approve
                    </Button>
                    <Button variant="outline" className="rounded-xl flex-1 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                      onClick={() => handleFlag(selectedStation.id)}
                      disabled={actionLoading === selectedStation.id}>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Flag
                    </Button>
                    <Button variant="outline" className="rounded-xl flex-1 text-slate-600"
                      onClick={() => handleReject(selectedStation.id)}
                      disabled={actionLoading === selectedStation.id}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </>
                )}
                {selectedStation.status === "FLAGGED" && (
                  <>
                    <Button variant="default" className="rounded-xl flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(selectedStation.id)}
                      disabled={actionLoading === selectedStation.id}>
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Approve After Review
                    </Button>
                    <Button variant="outline" className="rounded-xl flex-1 text-red-600"
                      onClick={() => handleReject(selectedStation.id)}
                      disabled={actionLoading === selectedStation.id}>
                      <XCircle className="h-4 w-4 mr-2" /> Reject
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}