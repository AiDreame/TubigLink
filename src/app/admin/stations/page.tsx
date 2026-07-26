"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Store,
  User,
  MapPin,
  Star,
  ShoppingBag,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  BarChart3,
  Loader2,
  ArrowRight,
  Eye,
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
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StationListItem {
  id: string;
  name: string;
  slug: string;
  city: string;
  province: string;
  address: string;
  barangay: string;
  rating: number;
  totalReviews: number;
  isActive: boolean;
  isFeatured: boolean;
  complianceScore: number;
  onboardingComplete: boolean;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  user: { name: string | null; phone: string | null; email: string | null };
  _count: { products: number; orders: number };
}

interface StationDocument {
  id: string;
  type: string;
  fileName: string;
  fileUrl: string;
  verificationStatus: string;
  rejectionReason?: string;
  uploadedAt: string;
}

interface StationDetail {
  id: string;
  name: string;
  slug: string;
  city: string;
  province: string;
  address: string;
  barangay: string;
  rating: number;
  totalReviews: number;
  isActive: boolean;
  isFeatured: boolean;
  complianceScore: number;
  onboardingComplete: boolean;
  approvedAt: string | null;
  rejectionReason: string | null;
  provisionalUntil: string | null;
  createdAt: string;
  businessType?: string;
  tin?: string;
  deliveryFee: number;
  minOrder: number;
  user: { name: string | null; phone: string | null; email: string | null };
  documents: StationDocument[];
  documentSummary: {
    total: number;
    pending: number;
    verified: number;
    rejected: number;
    expired: number;
  };
  _count: { products: number; orders: number };
}

export default function AdminStationsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [stations, setStations] = useState<StationListItem[]>([]);
  const [selectedStation, setSelectedStation] = useState<StationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session || (session.user as any)?.role !== "ADMIN") {
      router.push("/auth/login?callbackUrl=/admin/stations");
      return;
    }
  }, [session, sessionStatus, router]);

  const fetchStations = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stations");
      const json = await res.json();
      if (json.success) {
        setStations(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch stations:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus !== "loading" && session) {
      fetchStations();
    }
  }, [session, sessionStatus, fetchStations]);

  const openStationDetail = async (stationId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/verification/${stationId}`);
      const json = await res.json();
      if (json.success) {
        setSelectedStation(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch station detail:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleToggleActive = async (stationId: string, currentActive: boolean) => {
    setActionLoading(stationId);
    try {
      const res = await fetch("/api/admin/stations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stationId, isActive: !currentActive }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchStations();
      }
    } catch (err) {
      console.error("Toggle active error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  const getStatusBadge = (station: StationListItem) => {
    if (!station.onboardingComplete && !station.approvedAt && !station.rejectionReason) {
      return (
        <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800 font-medium">
          Pending Review
        </Badge>
      );
    }
    if (station.rejectionReason) {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800 font-medium">
          Rejected
        </Badge>
      );
    }
    if (station.approvedAt && station.isActive) {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800 font-medium">
          Active
        </Badge>
      );
    }
    if (station.approvedAt && !station.isActive) {
      return (
        <Badge variant="outline" className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700 font-medium">
          Inactive
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800 font-medium">
        In Review
      </Badge>
    );
  };

  const getDetailStatusBadge = (s: StationDetail) => {
    if (!s.onboardingComplete && !s.approvedAt && !s.rejectionReason) {
      return (
        <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800 font-medium">
          Pending Review
        </Badge>
      );
    }
    if (s.rejectionReason) {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800 font-medium">
          Rejected
        </Badge>
      );
    }
    if (s.approvedAt && s.isActive) {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800 font-medium">
          Active
        </Badge>
      );
    }
    if (s.approvedAt && !s.isActive) {
      return (
        <Badge variant="outline" className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700 font-medium">
          Inactive
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800 font-medium">
        In Review
      </Badge>
    );
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

  const filteredStations = stations.filter((s) =>
    searchTerm === "" ||
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.user?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  };

  const summaryData = {
    total: stations.length,
    active: stations.filter((s) => s.isActive && s.approvedAt).length,
    pending: stations.filter((s) => !s.onboardingComplete && !s.approvedAt && !s.rejectionReason).length,
    rejected: stations.filter((s) => !!s.rejectionReason).length,
    avgScore: stations.length > 0
      ? Math.round(stations.reduce((acc, s) => acc + (s.complianceScore || 0) * 100, 0) / stations.length)
      : 0,
  };

  if (isLoading || sessionStatus === "loading") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm text-slate-500">Loading stations...</p>
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
            Station Management
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Approve, monitor, and manage all water refilling stations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl" onClick={fetchStations}>
            <Loader2 className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button className="rounded-xl bg-blue-600 hover:bg-blue-700" asChild>
            <Link href="/admin/verification">
              <Shield className="h-4 w-4 mr-2" /> Verification Queue
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card className="bg-white dark:bg-gray-800/50 border-none shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{summaryData.total}</p>
            <p className="text-xs text-slate-500 mt-1">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/50 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">{summaryData.active}</p>
            <p className="text-xs text-green-600 dark:text-green-500 mt-1">Active</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{summaryData.pending}</p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/50 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">{summaryData.rejected}</p>
            <p className="text-xs text-red-600 dark:text-red-500 mt-1">Rejected</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-800/50 border-none shadow-sm">
          <CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${getScoreColor(summaryData.avgScore)}`}>{summaryData.avgScore}%</p>
            <p className="text-xs text-slate-500 mt-1">Avg Compliance</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search stations by name, owner, or city..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 rounded-xl bg-white dark:bg-gray-800/50"
        />
      </div>

      {/* Stations Table */}
      <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                <TableHead className="font-bold text-xs uppercase tracking-wider">Station</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider hidden md:table-cell">Owner</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Compliance</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider hidden lg:table-cell">Rating</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider hidden lg:table-cell">Orders</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider hidden lg:table-cell">Joined</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                    <Store className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p>No stations found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStations.map((station) => (
                  <TableRow
                    key={station.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer"
                    onClick={() => openStationDetail(station.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                          {station.name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-slate-900 dark:text-white">{station.name}</p>
                          <p className="text-xs text-slate-500">{station.city}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-slate-700 dark:text-slate-300">
                      {station.user?.name || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[80px]">
                          <Progress value={Math.round((station.complianceScore || 0) * 100)} className={`h-2 ${getScoreBarColor(Math.round((station.complianceScore || 0) * 100))}`} />
                        </div>
                        <span className={`text-sm font-bold ${getScoreColor(Math.round((station.complianceScore || 0) * 100))}`}>
                          {Math.round((station.complianceScore || 0) * 100)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(station)}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {station.rating > 0 ? `${station.rating} ⭐` : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-slate-700 dark:text-slate-300">
                      {station._count.orders.toLocaleString()}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-slate-500">
                      {formatDate(station.createdAt)}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="min-h-[36px] min-w-[36px]"
                          onClick={() => openStationDetail(station.id)}
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
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
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : selectedStation ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg">
                    {selectedStation.name[0]}
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{selectedStation.name}</DialogTitle>
                    <DialogDescription className="flex flex-wrap items-center gap-2">
                      <span>{selectedStation.id.slice(0, 8)}...</span>
                      <span>•</span>
                      <span>{selectedStation.city}</span>
                      <span>•</span>
                      {getDetailStatusBadge(selectedStation)}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="details" className="mt-4">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="compliance">Compliance</TabsTrigger>
                  <TabsTrigger value="documents">Documents ({selectedStation.documentSummary?.total || 0})</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700">
                      <p className="text-xs text-slate-500">Owner</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        {selectedStation.user?.name || "—"}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700">
                      <p className="text-xs text-slate-500">Phone</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                        {selectedStation.user?.phone || "—"}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700">
                      <p className="text-xs text-slate-500">Email</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 truncate">
                        {selectedStation.user?.email || "—"}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700">
                      <p className="text-xs text-slate-500">Business Type</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                        {(selectedStation.businessType || "—").replace(/_/g, " ")}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700 col-span-2">
                      <p className="text-xs text-slate-500">Address</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {selectedStation.address}, {selectedStation.barangay}, {selectedStation.city}, {selectedStation.province}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700">
                      <p className="text-xs text-slate-500">Orders</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                        {selectedStation._count.orders.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700">
                      <p className="text-xs text-slate-500">Rating</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                        {selectedStation.rating > 0 ? `${selectedStation.rating} ⭐` : "No ratings"}
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="compliance" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Compliance Score</span>
                      <span className={`text-lg font-bold ${getScoreColor(Math.round((selectedStation.complianceScore || 0) * 100))}`}>
                        {Math.round((selectedStation.complianceScore || 0) * 100)}%
                      </span>
                    </div>
                    <Progress
                      value={Math.round((selectedStation.complianceScore || 0) * 100)}
                      className={`h-3 ${getScoreBarColor(Math.round((selectedStation.complianceScore || 0) * 100))}`}
                    />

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <p className="text-xs text-slate-500">Documents</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mt-1">
                          {selectedStation.documentSummary?.verified === selectedStation.documentSummary?.total &&
                           selectedStation.documentSummary?.total > 0 ? (
                            <><CheckCircle2 className="h-4 w-4 text-green-500" /> All Verified</>
                          ) : selectedStation.documentSummary?.rejected > 0 ? (
                            <><XCircle className="h-4 w-4 text-red-500" /> Issues Found</>
                          ) : (
                            <><Clock className="h-4 w-4 text-amber-500" /> Pending</>
                          )}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <p className="text-xs text-slate-500">Approved</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                          {selectedStation.approvedAt ? (
                            <span className="text-green-600 dark:text-green-400">Yes</span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400">Pending</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {selectedStation.rejectionReason && (
                      <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-red-700 dark:text-red-400">Rejection Reason</p>
                            <p className="text-sm text-red-600 dark:text-red-300 mt-1">{selectedStation.rejectionReason}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="documents" className="space-y-3 mt-4">
                  {!selectedStation.documents || selectedStation.documents.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                      <p className="font-medium text-slate-700 dark:text-slate-300">No Documents</p>
                      <p className="text-sm mt-1">This station hasn't uploaded any documents yet.</p>
                    </div>
                  ) : (
                    selectedStation.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-slate-400" />
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{doc.type.replace(/_/g, " ")}</p>
                            <p className="text-xs text-slate-500">{doc.fileName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getDocStatusBadge(doc.verificationStatus)}
                          {doc.fileUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="min-h-[36px] min-w-[36px]"
                              onClick={() => window.open(doc.fileUrl, "_blank")}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>

              <DialogFooter className="mt-6 flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl flex-1"
                  onClick={() =>
                    handleToggleActive(selectedStation.id, selectedStation.isActive)
                  }
                  disabled={actionLoading === selectedStation.id}
                >
                  {actionLoading === selectedStation.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : selectedStation.isActive ? (
                    <XCircle className="h-4 w-4 mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  {selectedStation.isActive ? "Deactivate" : "Activate"}
                </Button>
                <Button variant="default" className="rounded-xl flex-1" asChild>
                  <Link href={`/admin/verification?station=${selectedStation.id}`}>
                    <ArrowRight className="h-4 w-4 mr-2" /> Full Verification
                  </Link>
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
