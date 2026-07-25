"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Store,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Loader2,
  ArrowRight,
  FileText,
  Search,
  User,
  MapPin,
  Download,
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
// import { Progress } from "@/components/ui/progress";

interface StationCompliance {
  id: string;
  name: string;
  owner: string;
  city: string;
  rating: number;
  totalOrders: number;
  totalReviews: number;
  score: number;
  status: "COMPLIANT" | "WARNING" | "NON_COMPLIANT" | "PENDING_REVIEW";
  documentsValid: boolean;
  lastCheck: string;
  flags: string[];
}

export default function AdminCompliancePage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState<StationCompliance | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session || (session.user as any)?.role !== "ADMIN") {
      router.push("/auth/login?callbackUrl=/admin/compliance");
      return;
    }
    setIsLoading(false);
  }, [session, sessionStatus, router]);

  const [stations, setStations] = useState<StationCompliance[]>([
    { id: "ST-001", name: "AquaPure Makati", owner: "Juan Dela Cruz", city: "Makati", rating: 4.8, totalOrders: 1240, totalReviews: 320, score: 95, status: "COMPLIANT", documentsValid: true, lastCheck: "2026-07-10T14:00:00", flags: [] },
    { id: "ST-002", name: "Healthy Drops BGC", owner: "Maria Clara", city: "Taguig", rating: 0, totalOrders: 0, totalReviews: 0, score: 45, status: "PENDING_REVIEW", documentsValid: false, lastCheck: "2026-07-09T14:00:00", flags: ["Missing documents", "No orders yet"] },
    { id: "ST-003", name: "Clear Water QC", owner: "Santi Ramos", city: "Quezon City", rating: 4.2, totalOrders: 856, totalReviews: 210, score: 72, status: "WARNING", documentsValid: true, lastCheck: "2026-07-08T10:00:00", flags: ["Low stock alert", "Slow delivery times"] },
    { id: "ST-004", name: "Spring Fresh Manila", owner: "Elena Garcia", city: "Manila", rating: 4.5, totalOrders: 2100, totalReviews: 450, score: 88, status: "COMPLIANT", documentsValid: true, lastCheck: "2026-07-07T09:00:00", flags: [] },
    { id: "ST-005", name: "Davao Pure Water", owner: "Pedro Santos", city: "Davao City", rating: 3.8, totalOrders: 124, totalReviews: 32, score: 35, status: "NON_COMPLIANT", documentsValid: false, lastCheck: "2026-07-06T16:00:00", flags: ["Expired permits", "No water quality test on file", "Customer complaints"] },
    { id: "ST-006", name: "Cebu H2O Station", owner: "Ana Lim", city: "Cebu City", rating: 0, totalOrders: 0, totalReviews: 0, score: 55, status: "PENDING_REVIEW", documentsValid: false, lastCheck: "2026-07-11T07:00:00", flags: ["Awaiting document submission"] },
    { id: "ST-007", name: "H2Opure Pasig", owner: "Carlos Reyes", city: "Pasig", rating: 4.6, totalOrders: 654, totalReviews: 178, score: 82, status: "COMPLIANT", documentsValid: true, lastCheck: "2026-07-05T10:00:00", flags: [] },
    { id: "ST-008", name: "Cool Water Mandaluyong", owner: "Lisa Tan", city: "Mandaluyong", rating: 4.1, totalOrders: 432, totalReviews: 95, score: 68, status: "WARNING", documentsValid: true, lastCheck: "2026-07-04T11:00:00", flags: ["Delivery reports missing"] },
  ]);

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

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      COMPLIANT: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
      WARNING: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
      NON_COMPLIANT: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
      PENDING_REVIEW: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    };
    return <Badge variant="outline" className={`${styles[status]} font-medium`}>{status.replace("_", " ")}</Badge>;
  };

  const filteredStations = stations.filter((s) =>
    searchTerm === "" ||
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  };

  const handleRecheck = async (stationId: string) => {
    setActionLoading(stationId);
    await new Promise((r) => setTimeout(r, 1500));
    setStations((prev) => prev.map((s) => s.id === stationId ? { ...s, lastCheck: new Date().toISOString() } : s));
    setActionLoading(null);
  };

  const summaryData = {
    total: stations.length,
    compliant: stations.filter((s) => s.status === "COMPLIANT").length,
    warning: stations.filter((s) => s.status === "WARNING").length,
    nonCompliant: stations.filter((s) => s.status === "NON_COMPLIANT").length,
    pending: stations.filter((s) => s.status === "PENDING_REVIEW").length,
    avgScore: Math.round(stations.reduce((acc, s) => acc + s.score, 0) / stations.length),
  };

  if (isLoading || sessionStatus === "loading") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm text-slate-500">Loading compliance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Compliance Dashboard
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Monitor station compliance scores and regulatory adherence
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl">
            <Download className="h-4 w-4 mr-2" /> Export Report
          </Button>
          <Button className="rounded-xl bg-blue-600 hover:bg-blue-700">
            <Shield className="h-4 w-4 mr-2" /> Run All Checks
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-6">
        <Card className="bg-white dark:bg-gray-800/50 border-none shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{summaryData.total}</p>
            <p className="text-xs text-slate-500 mt-1">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/50 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">{summaryData.compliant}</p>
            <p className="text-xs text-green-600 dark:text-green-500 mt-1">Compliant</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{summaryData.warning}</p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Warning</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/50 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">{summaryData.nonCompliant}</p>
            <p className="text-xs text-red-600 dark:text-red-500 mt-1">Non-Compliant</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{summaryData.pending}</p>
            <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">Pending Review</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-800/50 border-none shadow-sm">
          <CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${getScoreColor(summaryData.avgScore)}`}>{summaryData.avgScore}%</p>
            <p className="text-xs text-slate-500 mt-1">Avg Score</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-white dark:bg-gray-800/50 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg dark:text-white">Compliance Distribution</CardTitle>
            <CardDescription>Station compliance status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: "Compliant", count: summaryData.compliant, color: "bg-green-500", percent: Math.round(summaryData.compliant / summaryData.total * 100) },
                { label: "Warning", count: summaryData.warning, color: "bg-amber-500", percent: Math.round(summaryData.warning / summaryData.total * 100) },
                { label: "Non-Compliant", count: summaryData.nonCompliant, color: "bg-red-500", percent: Math.round(summaryData.nonCompliant / summaryData.total * 100) },
                { label: "Pending Review", count: summaryData.pending, color: "bg-blue-500", percent: Math.round(summaryData.pending / summaryData.total * 100) },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{item.count} ({item.percent}%)</span>
                  </div>
                  <Progress value={item.percent} className={`h-2.5 ${item.color}`} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800/50 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg dark:text-white">Score Ranges</CardTitle>
            <CardDescription>Compliance score distribution across all stations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { range: "90-100%", count: stations.filter((s) => s.score >= 90).length, color: "bg-green-500" },
                { range: "75-89%", count: stations.filter((s) => s.score >= 75 && s.score < 90).length, color: "bg-blue-500" },
                { range: "60-74%", count: stations.filter((s) => s.score >= 60 && s.score < 75).length, color: "bg-amber-500" },
                { range: "40-59%", count: stations.filter((s) => s.score >= 40 && s.score < 60).length, color: "bg-orange-500" },
                { range: "0-39%", count: stations.filter((s) => s.score < 40).length, color: "bg-red-500" },
              ].map((item) => {
                const percent = Math.round(item.count / summaryData.total * 100);
                return (
                  <div key={item.range} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-700 dark:text-slate-300">{item.range}</span>
                      <span className="font-bold text-slate-900 dark:text-white">{item.count} stations</span>
                    </div>
                    <Progress value={percent} className={`h-2.5 ${item.color}`} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search stations by name, owner, or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 rounded-xl bg-white dark:bg-gray-800/50"
        />
      </div>

      {/* Table */}
      <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                <TableHead className="font-bold text-xs uppercase tracking-wider">Station</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider hidden md:table-cell">Owner</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Score</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider hidden lg:table-cell">Rating</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider hidden lg:table-cell">Orders</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider hidden lg:table-cell">Last Check</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                    <Shield className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p>No stations found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStations.map((station) => (
                  <TableRow key={station.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer"
                    onClick={() => setSelectedStation(station)}>
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
                    <TableCell className="hidden md:table-cell text-sm text-slate-700 dark:text-slate-300">{station.owner}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[80px]">
                          <Progress value={station.score} className={`h-2 ${getScoreBarColor(station.score)}`} />
                        </div>
                        <span className={`text-sm font-bold ${getScoreColor(station.score)}`}>{station.score}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(station.status)}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {station.rating > 0 ? `${station.rating} ⭐` : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-slate-700 dark:text-slate-300">{station.totalOrders.toLocaleString()}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-slate-500">{formatDate(station.lastCheck)}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="min-h-[36px] min-w-[36px]"
                        onClick={() => setSelectedStation(station)}>
                        <BarChart3 className="h-4 w-4" />
                      </Button>
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
          {selectedStation && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg">
                    {selectedStation.name[0]}
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{selectedStation.name}</DialogTitle>
                    <DialogDescription>
                      {selectedStation.id} • {selectedStation.city} • {getStatusBadge(selectedStation.status)}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="compliance" className="mt-4">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="compliance">Compliance</TabsTrigger>
                  <TabsTrigger value="stats">Statistics</TabsTrigger>
                  <TabsTrigger value="flags">Flags & Issues</TabsTrigger>
                </TabsList>

                <TabsContent value="compliance" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Compliance Score</span>
                      <span className={`text-lg font-bold ${getScoreColor(selectedStation.score)}`}>{selectedStation.score}%</span>
                    </div>
                    <Progress value={selectedStation.score} className={`h-3 ${getScoreBarColor(selectedStation.score)}`} />

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <p className="text-xs text-slate-500">Documents</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mt-1">
                          {selectedStation.documentsValid ? (
                            <><CheckCircle2 className="h-4 w-4 text-green-500" /> Valid</>
                          ) : (
                            <><XCircle className="h-4 w-4 text-red-500" /> Issues Found</>
                          )}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <p className="text-xs text-slate-500">Last Compliance Check</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">{formatDate(selectedStation.lastCheck)}</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Compliance Checklist</p>
                      <div className="space-y-2">
                        {[
                          { label: "Valid Business Registration", done: selectedStation.score >= 60 },
                          { label: "Permits Up to Date", done: selectedStation.score >= 70 },
                          { label: "Water Quality Test on File", done: selectedStation.score >= 80 },
                          { label: "Owner Identity Verified", done: selectedStation.score >= 80 },
                          { label: "Active Delivery Operations", done: selectedStation.totalOrders > 0 },
                          { label: "Customer Complaints Addressed", done: selectedStation.flags.length === 0 },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            {item.done ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <Clock className="h-4 w-4 text-amber-500" />
                            )}
                            <span className={item.done ? "text-slate-600 dark:text-slate-400" : "text-slate-500 dark:text-slate-500"}>
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="stats" className="space-y-3 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Total Orders", value: selectedStation.totalOrders.toLocaleString(), trend: "up" },
                      { label: "Reviews", value: selectedStation.totalReviews.toLocaleString(), trend: "up" },
                      { label: "Rating", value: selectedStation.rating > 0 ? `${selectedStation.rating} / 5` : "No ratings", trend: "up" },
                      { label: "Compliance Score", value: `${selectedStation.score}%`, trend: selectedStation.score >= 60 ? "up" : "down" },
                    ].map((stat) => (
                      <div key={stat.label} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-slate-500">{stat.label}</p>
                          {stat.trend === "up" ? (
                            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                          )}
                        </div>
                        <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="flags" className="space-y-3 mt-4">
                  {selectedStation.flags.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <ShieldCheck className="h-12 w-12 mx-auto mb-3 text-green-400" />
                      <p className="font-medium text-slate-700 dark:text-slate-300">No Issues Found</p>
                      <p className="text-sm mt-1">This station is fully compliant.</p>
                    </div>
                  ) : (
                    selectedStation.flags.map((flag, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50">
                        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-red-700 dark:text-red-400">Issue #{i + 1}</p>
                          <p className="text-sm text-red-600 dark:text-red-300">{flag}</p>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>

              <DialogFooter className="mt-6 flex-col sm:flex-row gap-2">
                <Button variant="outline" className="rounded-xl flex-1"
                  onClick={() => handleRecheck(selectedStation.id)}
                  disabled={actionLoading === selectedStation.id}>
                  {actionLoading === selectedStation.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Shield className="h-4 w-4 mr-2" />
                  )}
                  Re-check Compliance
                </Button>
                <Button variant="default" className="rounded-xl flex-1" asChild>
                  <Link href={`/admin/verification?station=${selectedStation.id}`}>
                    <ArrowRight className="h-4 w-4 mr-2" /> Full Verification
                  </Link>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}