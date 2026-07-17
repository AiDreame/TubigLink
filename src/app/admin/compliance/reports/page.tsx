"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Download,
  Search,
  Filter,
  ChevronDown,
  Loader2,
  Eye,
  Printer,
  Share2,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Store,
  TrendingUp,
  ArrowUpRight,
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ComplianceReport {
  id: string;
  title: string;
  type: string;
  period: string;
  generatedAt: string;
  status: "READY" | "GENERATING" | "FAILED";
  stationCount: number;
  summary: string;
}

export default function AdminComplianceReportsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ComplianceReport | null>(null);
  const [dateRange, setDateRange] = useState("last30");

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session || (session.user as any)?.role !== "ADMIN") {
      router.push("/auth/login?callbackUrl=/admin/compliance/reports");
      return;
    }
    setIsLoading(false);
  }, [session, sessionStatus, router]);

  const [reports, setReports] = useState<ComplianceReport[]>([
    { id: "RPT-001", title: "Monthly Compliance Summary", type: "Monthly", period: "June 2026", generatedAt: "2026-07-01T08:00:00", status: "READY", stationCount: 8, summary: "Overall compliance score: 67.5%. 4 stations fully compliant, 2 with warnings." },
    { id: "RPT-002", title: "Document Verification Report", type: "Ad-hoc", period: "Q2 2026", generatedAt: "2026-06-30T10:00:00", status: "READY", stationCount: 8, summary: "24 documents reviewed. 15 verified, 5 pending, 4 rejected." },
    { id: "RPT-003", title: "Weekly Station Audit", type: "Weekly", period: "Jun 22-28, 2026", generatedAt: "2026-06-28T23:59:00", status: "READY", stationCount: 6, summary: "3 stations audited this week. 2 compliant, 1 non-compliant." },
    { id: "RPT-004", title: "Pending Verification Report", type: "Ad-hoc", period: "Current", generatedAt: "2026-07-11T07:00:00", status: "GENERATING", stationCount: 3, summary: "Generating report for all stations pending verification..." },
    { id: "RPT-005", title: "Compliance Score Trends", type: "Monthly", period: "May 2026", generatedAt: "2026-06-01T08:00:00", status: "READY", stationCount: 5, summary: "Average score increased by 8% compared to previous month." },
    { id: "RPT-006", title: "Expired Documents Alert", type: "Alert", period: "Current", generatedAt: "2026-07-10T14:00:00", status: "READY", stationCount: 2, summary: "2 stations have expired documents requiring immediate attention." },
    { id: "RPT-007", title: "Full Compliance Audit - Q2 2026", type: "Quarterly", period: "Q2 2026", generatedAt: "2026-06-30T23:59:00", status: "FAILED", stationCount: 0, summary: "Report generation failed due to data inconsistency. Please regenerate." },
  ]);

  const handleRegenerate = async (reportId: string) => {
    setReports((prev) => prev.map((r) => r.id === reportId ? { ...r, status: "GENERATING" as const } : r));
    await new Promise((r) => setTimeout(r, 3000));
    setReports((prev) => prev.map((r) => r.id === reportId ? { ...r, status: "READY" as const, generatedAt: new Date().toISOString() } : r));
  };

  const filteredReports = reports.filter((r) => {
    const matchesSearch = searchTerm === "" ||
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "ALL" || r.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      READY: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
      GENERATING: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
      FAILED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
    };
    return <Badge variant="outline" className={`${styles[status]} font-medium`}>{status}</Badge>;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Monthly": return <Calendar className="h-4 w-4 text-blue-500" />;
      case "Weekly": return <Clock className="h-4 w-4 text-purple-500" />;
      case "Quarterly": return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "Alert": return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <FileText className="h-4 w-4 text-slate-500" />;
    }
  };

  if (isLoading || sessionStatus === "loading") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm text-slate-500">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Compliance Reports
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Generate and download compliance audit reports
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px] rounded-xl">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last7">Last 7 Days</SelectItem>
              <SelectItem value="last30">Last 30 Days</SelectItem>
              <SelectItem value="last90">Last 90 Days</SelectItem>
              <SelectItem value="thisyear">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button className="rounded-xl bg-blue-600 hover:bg-blue-700">
            <FileText className="h-4 w-4 mr-2" /> Generate New Report
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Reports", value: reports.length, icon: FileText, color: "text-blue-600 dark:text-blue-400" },
          { label: "Ready", value: reports.filter((r) => r.status === "READY").length, icon: CheckCircle2, color: "text-green-600 dark:text-green-400" },
          { label: "Generating", value: reports.filter((r) => r.status === "GENERATING").length, icon: Loader2, color: "text-blue-500" },
          { label: "Failed", value: reports.filter((r) => r.status === "FAILED").length, icon: AlertTriangle, color: "text-red-600 dark:text-red-400" },
        ].map((stat) => (
          <Card key={stat.label} className="bg-white dark:bg-gray-800/50 border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <stat.icon className={`h-8 w-8 ${stat.color} ${stat.label === "Generating" ? "animate-spin" : ""}`} />
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl bg-white dark:bg-gray-800/50"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="rounded-xl min-w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              {typeFilter === "ALL" ? "All Types" : typeFilter}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setTypeFilter("ALL")}>All Types</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setTypeFilter("Monthly")}>Monthly</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTypeFilter("Weekly")}>Weekly</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTypeFilter("Quarterly")}>Quarterly</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTypeFilter("Ad-hoc")}>Ad-hoc</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTypeFilter("Alert")}>Alert</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Reports Table */}
      <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                <TableHead className="font-bold text-xs uppercase tracking-wider">Report</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Type</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider hidden md:table-cell">Period</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider hidden md:table-cell">Stations</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider hidden lg:table-cell">Generated</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p>No reports found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredReports.map((report) => (
                  <TableRow key={report.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer"
                    onClick={() => setSelectedReport(report)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getTypeIcon(report.type)}
                        <div>
                          <p className="font-medium text-sm text-slate-900 dark:text-white">{report.title}</p>
                          <p className="text-xs text-slate-500">{report.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-sm text-slate-600 dark:text-slate-400">{report.type}</span></TableCell>
                    <TableCell className="hidden md:table-cell"><span className="text-sm text-slate-600 dark:text-slate-400">{report.period}</span></TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {report.status === "FAILED" ? (
                        <span className="text-sm text-slate-400">—</span>
                      ) : (
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{report.stationCount}</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell"><span className="text-xs text-slate-500">{formatDate(report.generatedAt)}</span></TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" className="min-h-[36px] min-w-[36px]"
                          onClick={() => setSelectedReport(report)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {report.status === "READY" && (
                          <Button variant="ghost" size="sm" className="min-h-[36px] min-w-[36px]">
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {report.status === "FAILED" && (
                          <Button variant="ghost" size="sm" className="min-h-[36px] min-w-[36px] text-red-500"
                            onClick={() => handleRegenerate(report.id)}>
                            <Loader2 className="h-4 w-4" />
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

      {/* Report Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-lg">
          {selectedReport && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  {getTypeIcon(selectedReport.type)}
                  <div>
                    <DialogTitle className="text-lg">{selectedReport.title}</DialogTitle>
                    <DialogDescription>
                      {selectedReport.id} • {selectedReport.period}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type</p>
                    <p className="text-sm mt-1">{selectedReport.type}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedReport.status)}</div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stations Covered</p>
                    <p className="text-sm mt-1">{selectedReport.status === "FAILED" ? "—" : selectedReport.stationCount}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Generated</p>
                    <p className="text-sm mt-1">{formatDate(selectedReport.generatedAt)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Summary</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                    {selectedReport.summary}
                  </p>
                </div>

                <div className="flex gap-2">
                  {selectedReport.status === "READY" && (
                    <>
                      <Button className="flex-1 rounded-xl">
                        <Download className="h-4 w-4 mr-2" /> Download PDF
                      </Button>
                      <Button variant="outline" className="rounded-xl">
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" className="rounded-xl">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {selectedReport.status === "FAILED" && (
                    <Button className="flex-1 rounded-xl"
                      onClick={() => handleRegenerate(selectedReport.id)}>
                      <Loader2 className="h-4 w-4 mr-2" /> Regenerate Report
                    </Button>
                  )}
                  {selectedReport.status === "GENERATING" && (
                    <Button className="flex-1 rounded-xl" disabled>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}