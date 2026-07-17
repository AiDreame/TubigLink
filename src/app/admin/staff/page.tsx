"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  Search,
  Mail,
  Shield,
  ShieldCheck,
  ShieldAlert,
  MoreVertical,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  ChevronDown,
  Filter,
  Ban,
  RefreshCw,
  Building2,
  Store,
  Phone,
  Trash2,
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";

type StaffRole = "ADMIN" | "MODERATOR" | "SUPPORT" | "VIEWER";
type InviteStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  assignedStations: number;
  lastActive: string;
  joinedAt: string;
}

interface PendingInvite {
  id: string;
  email: string;
  role: StaffRole;
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  status: InviteStatus;
  token: string;
}

export default function AdminStaffPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<StaffRole | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("staff");

  // Invite dialog
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<StaffRole>("MODERATOR");
  const [inviteMessage, setInviteMessage] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  // Detail dialog
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [selectedInvite, setSelectedInvite] = useState<PendingInvite | null>(null);

  // Action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session || (session.user as any)?.role !== "ADMIN") {
      router.push("/auth/login?callbackUrl=/admin/staff");
      return;
    }
    setIsLoading(false);
  }, [session, sessionStatus, router]);

  // Placeholder data — will be replaced with API calls
  const [staff, setStaff] = useState<StaffMember[]>([
    { id: "USR-001", name: "Maria Santos", email: "maria@aqualink.ph", phone: "09171234567", role: "ADMIN", status: "ACTIVE", assignedStations: 8, lastActive: "2026-07-15T09:30:00", joinedAt: "2026-01-15T08:00:00" },
    { id: "USR-002", name: "Jose Rizal", email: "jose@aqualink.ph", phone: "09179876543", role: "MODERATOR", status: "ACTIVE", assignedStations: 5, lastActive: "2026-07-14T14:00:00", joinedAt: "2026-03-01T10:00:00" },
    { id: "USR-003", name: "Ana Dela Cruz", email: "ana@aqualink.ph", phone: "09175551234", role: "SUPPORT", status: "ACTIVE", assignedStations: 3, lastActive: "2026-07-15T08:00:00", joinedAt: "2026-04-10T09:00:00" },
    { id: "USR-004", name: "Pedro Santos", email: "pedro@aqualink.ph", phone: "09174443333", role: "VIEWER", status: "INACTIVE", assignedStations: 0, lastActive: "2026-06-20T11:00:00", joinedAt: "2026-05-01T08:00:00" },
    { id: "USR-005", name: "Luzviminda Gonzales", email: "luz@aqualink.ph", phone: "09176667777", role: "MODERATOR", status: "SUSPENDED", assignedStations: 2, lastActive: "2026-06-01T16:00:00", joinedAt: "2026-02-15T10:00:00" },
  ]);

  const [invites, setInvites] = useState<PendingInvite[]>([
    { id: "INV-001", email: "newstaff@aqualink.ph", role: "MODERATOR", invitedBy: "Maria Santos", invitedAt: "2026-07-14T10:00:00", expiresAt: "2026-07-21T10:00:00", status: "PENDING", token: "abc123def456" },
    { id: "INV-002", email: "support2@aqualink.ph", role: "SUPPORT", invitedBy: "Maria Santos", invitedAt: "2026-07-13T09:00:00", expiresAt: "2026-07-20T09:00:00", status: "PENDING", token: "ghi789jkl012" },
    { id: "INV-003", email: "viewer2@aqualink.ph", role: "VIEWER", invitedBy: "Jose Rizal", invitedAt: "2026-07-10T14:00:00", expiresAt: "2026-07-17T14:00:00", status: "ACCEPTED", token: "mno345pqr678" },
    { id: "INV-004", email: "oldinvite@aqualink.ph", role: "MODERATOR", invitedBy: "Maria Santos", invitedAt: "2026-06-01T08:00:00", expiresAt: "2026-06-08T08:00:00", status: "EXPIRED", token: "stu901vwx234" },
  ]);

  const getRoleBadge = (role: StaffRole) => {
    const styles: Record<StaffRole, string> = {
      ADMIN: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
      MODERATOR: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
      SUPPORT: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
      VIEWER: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700",
    };
    return <Badge variant="outline" className={`${styles[role]} font-medium`}>{role}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      INACTIVE: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      SUSPENDED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      PENDING: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
      ACCEPTED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
      EXPIRED: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700",
      CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
    };
    return <Badge variant="outline" className={`${styles[status]} font-medium`}>{status}</Badge>;
  };

  const getRoleIcon = (role: StaffRole) => {
    switch (role) {
      case "ADMIN": return <ShieldAlert className="h-4 w-4 text-red-500" />;
      case "MODERATOR": return <ShieldCheck className="h-4 w-4 text-blue-500" />;
      case "SUPPORT": return <Shield className="h-4 w-4 text-green-500" />;
      default: return <Shield className="h-4 w-4 text-slate-400" />;
    }
  };

  const filteredStaff = staff.filter((s) => {
    const matchesSearch = searchTerm === "" ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "ALL" || s.role === roleFilter;
    const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const filteredInvites = invites.filter((i) => {
    const matchesSearch = searchTerm === "" ||
      i.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setIsInviting(true);
    await new Promise((r) => setTimeout(r, 1500));
    const newInvite: PendingInvite = {
      id: `INV-${String(invites.length + 1).padStart(3, "0")}`,
      email: inviteEmail,
      role: inviteRole,
      invitedBy: session?.user?.name || "Admin",
      invitedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: "PENDING",
      token: Math.random().toString(36).substring(2, 14),
    };
    setInvites([newInvite, ...invites]);
    toast.success(`Invitation sent to ${inviteEmail}!`);
    setShowInviteDialog(false);
    setInviteEmail("");
    setInviteRole("MODERATOR");
    setInviteMessage("");
    setIsInviting(false);
  };

  const handleCancelInvite = async (inviteId: string) => {
    setActionLoading(inviteId);
    await new Promise((r) => setTimeout(r, 800));
    setInvites((prev) => prev.map((i) => i.id === inviteId ? { ...i, status: "CANCELLED" as InviteStatus } : i));
    setActionLoading(null);
    if (selectedInvite?.id === inviteId) setSelectedInvite((prev) => prev ? { ...prev, status: "CANCELLED" } : null);
    toast.success("Invitation cancelled.");
  };

  const handleResendInvite = async (inviteId: string) => {
    setActionLoading(inviteId);
    await new Promise((r) => setTimeout(r, 1000));
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    setInvites((prev) => prev.map((i) => i.id === inviteId ? { ...i, status: "PENDING", expiresAt } : i));
    setActionLoading(null);
    toast.success("Invitation resent!");
  };

  const handleCopyLink = (token: string) => {
    const link = `${window.location.origin}/invite/accept/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied to clipboard!");
  };

  const handleSuspendStaff = async (staffId: string) => {
    setActionLoading(staffId);
    await new Promise((r) => setTimeout(r, 800));
    setStaff((prev) => prev.map((s) => s.id === staffId ? { ...s, status: "SUSPENDED" as const } : s));
    setActionLoading(null);
    if (selectedStaff?.id === staffId) setSelectedStaff((prev) => prev ? { ...prev, status: "SUSPENDED" } : null);
    toast.success("Staff member suspended.");
  };

  const handleActivateStaff = async (staffId: string) => {
    setActionLoading(staffId);
    await new Promise((r) => setTimeout(r, 800));
    setStaff((prev) => prev.map((s) => s.id === staffId ? { ...s, status: "ACTIVE" as const } : s));
    setActionLoading(null);
    if (selectedStaff?.id === staffId) setSelectedStaff((prev) => prev ? { ...prev, status: "ACTIVE" } : null);
    toast.success("Staff member activated.");
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
          <p className="text-sm text-slate-500">Loading staff management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Staff Management
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage team members, roles, and invitations
          </p>
        </div>
        <Button className="rounded-xl bg-blue-600 hover:bg-blue-700" onClick={() => setShowInviteDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" /> Invite Staff
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Total Staff", value: staff.length, icon: Users, color: "text-blue-600" },
          { label: "Active", value: staff.filter((s) => s.status === "ACTIVE").length, icon: CheckCircle2, color: "text-green-600" },
          { label: "Inactive", value: staff.filter((s) => s.status === "INACTIVE").length, icon: Clock, color: "text-amber-600" },
          { label: "Suspended", value: staff.filter((s) => s.status === "SUSPENDED").length, icon: Ban, color: "text-red-600" },
          { label: "Pending Invites", value: invites.filter((i) => i.status === "PENDING").length, icon: Mail, color: "text-blue-500" },
        ].map((stat) => (
          <Card key={stat.label} className="bg-white dark:bg-gray-800/50 border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-2 max-w-md">
          <TabsTrigger value="staff">Staff Members</TabsTrigger>
          <TabsTrigger value="invites">Pending Invites</TabsTrigger>
        </TabsList>

        {/* Staff Tab */}
        <TabsContent value="staff" className="space-y-4 mt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search staff by name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl bg-white dark:bg-gray-800/50"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-xl min-w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  {roleFilter === "ALL" ? "All Roles" : roleFilter}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setRoleFilter("ALL")}>All Roles</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setRoleFilter("ADMIN")}>Admin</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRoleFilter("MODERATOR")}>Moderator</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRoleFilter("SUPPORT")}>Support</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRoleFilter("VIEWER")}>Viewer</DropdownMenuItem>
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
                <DropdownMenuItem onClick={() => setStatusFilter("ACTIVE")}>Active</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("INACTIVE")}>Inactive</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("SUSPENDED")}>Suspended</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Staff</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Role</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider hidden md:table-cell">Status</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider hidden lg:table-cell">Stations</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider hidden lg:table-cell">Last Active</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                        <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                        <p>No staff members found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStaff.map((member) => (
                      <TableRow key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer"
                        onClick={() => setSelectedStaff(member)}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
                              {member.name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-sm text-slate-900 dark:text-white">{member.name}</p>
                              <p className="text-xs text-slate-500">{member.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getRoleIcon(member.role)}
                            <span className="text-sm">{member.role}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{getStatusBadge(member.status)}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-slate-700 dark:text-slate-300">{member.assignedStations}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-slate-500">{formatDate(member.lastActive)}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="min-h-[36px] min-w-[36px]">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedStaff(member)}>View Details</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {member.status === "ACTIVE" && (
                                <DropdownMenuItem onClick={() => handleSuspendStaff(member.id)}
                                  disabled={actionLoading === member.id}
                                  className="text-red-600">
                                  {actionLoading === member.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
                                  Suspend
                                </DropdownMenuItem>
                              )}
                              {member.status === "SUSPENDED" && (
                                <DropdownMenuItem onClick={() => handleActivateStaff(member.id)}
                                  disabled={actionLoading === member.id}>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Reactivate
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Invites Tab */}
        <TabsContent value="invites" className="space-y-4 mt-6">
          <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Email</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Role</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider hidden md:table-cell">Invited By</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Status</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider hidden lg:table-cell">Expires</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvites.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                        <Mail className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                        <p>No invitations found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvites.map((invite) => (
                      <TableRow key={invite.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer"
                        onClick={() => setSelectedInvite(invite)}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                              <Mail className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium text-sm text-slate-900 dark:text-white">{invite.email}</p>
                              <p className="text-xs text-slate-500">{invite.id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getRoleIcon(invite.role)}
                            <span className="text-sm">{invite.role}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-slate-700 dark:text-slate-300">{invite.invitedBy}</TableCell>
                        <TableCell>{getStatusBadge(invite.status)}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-slate-500">{formatDate(invite.expiresAt)}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" className="min-h-[36px] min-w-[36px]"
                              onClick={() => handleCopyLink(invite.token)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            {invite.status === "PENDING" && (
                              <>
                                <Button variant="ghost" size="sm" className="min-h-[36px] min-w-[36px] text-blue-600"
                                  onClick={() => handleResendInvite(invite.id)}
                                  disabled={actionLoading === invite.id}>
                                  {actionLoading === invite.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                </Button>
                                <Button variant="ghost" size="sm" className="min-h-[36px] min-w-[36px] text-red-600"
                                  onClick={() => handleCancelInvite(invite.id)}
                                  disabled={actionLoading === invite.id}>
                                  {actionLoading === invite.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                                </Button>
                              </>
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
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              Invite Staff Member
            </DialogTitle>
            <DialogDescription>
              Send an invitation to join the AquaLink PH admin team
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">Email Address</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="colleague@email.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="min-h-[48px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteRole">Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as StaffRole)}>
                <SelectTrigger id="inviteRole" className="min-h-[48px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">
                    <div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-red-500" /> Admin</div>
                  </SelectItem>
                  <SelectItem value="MODERATOR">
                    <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-500" /> Moderator</div>
                  </SelectItem>
                  <SelectItem value="SUPPORT">
                    <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-green-500" /> Support</div>
                  </SelectItem>
                  <SelectItem value="VIEWER">
                    <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-slate-400" /> Viewer</div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteMessage">Personal Message (optional)</Label>
              <Textarea
                id="inviteMessage"
                placeholder="Hi! I'd like to invite you to join the AquaLink PH admin team..."
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                rows={3}
                className="rounded-xl"
              />
            </div>
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 p-3 border border-blue-100 dark:border-blue-800/50">
              <p className="text-xs text-blue-700 dark:text-blue-400">
                An invitation email will be sent with a link to accept. The invite expires in 7 days.
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowInviteDialog(false)} className="rounded-xl flex-1">
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={isInviting} className="rounded-xl flex-1 bg-blue-600 hover:bg-blue-700">
              {isInviting ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Sending...</span>
              ) : (
                <span className="flex items-center gap-2"><Mail className="h-4 w-4" /> Send Invitation</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Staff Detail Dialog */}
      <Dialog open={!!selectedStaff} onOpenChange={(open) => !open && setSelectedStaff(null)}>
        <DialogContent className="max-w-lg">
          {selectedStaff && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg">
                    {selectedStaff.name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{selectedStaff.name}</DialogTitle>
                    <DialogDescription>
                      {selectedStaff.id} • {selectedStaff.email} • {getStatusBadge(selectedStaff.status)}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs text-slate-500">Role</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getRoleIcon(selectedStaff.role)}
                    <span className="font-medium text-slate-900 dark:text-white">{selectedStaff.role}</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs text-slate-500">Phone</p>
                  <p className="font-medium text-sm text-slate-900 dark:text-white mt-1">{selectedStaff.phone}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs text-slate-500">Assigned Stations</p>
                  <p className="font-medium text-sm text-slate-900 dark:text-white mt-1">{selectedStaff.assignedStations}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs text-slate-500">Joined</p>
                  <p className="font-medium text-sm text-slate-900 dark:text-white mt-1">{formatDate(selectedStaff.joinedAt)}</p>
                </div>
                <div className="col-span-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs text-slate-500">Last Active</p>
                  <p className="font-medium text-sm text-slate-900 dark:text-white mt-1">{formatDate(selectedStaff.lastActive)}</p>
                </div>
              </div>

              <DialogFooter className="flex gap-2">
                {selectedStaff.status === "ACTIVE" && (
                  <Button variant="outline" className="rounded-xl flex-1 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                    onClick={() => handleSuspendStaff(selectedStaff.id)}
                    disabled={actionLoading === selectedStaff.id}>
                    <Ban className="h-4 w-4 mr-2" /> Suspend
                  </Button>
                )}
                {selectedStaff.status === "SUSPENDED" && (
                  <Button variant="outline" className="rounded-xl flex-1"
                    onClick={() => handleActivateStaff(selectedStaff.id)}
                    disabled={actionLoading === selectedStaff.id}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Reactivate
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Invite Detail Dialog */}
      <Dialog open={!!selectedInvite} onOpenChange={(open) => !open && setSelectedInvite(null)}>
        <DialogContent className="max-w-md">
          {selectedInvite && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <Mail className="h-5 w-5 text-purple-600" />
                  Invitation Details
                </DialogTitle>
                <DialogDescription>{selectedInvite.id}</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 col-span-2">
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="font-medium text-sm text-slate-900 dark:text-white mt-1">{selectedInvite.email}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs text-slate-500">Role</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getRoleIcon(selectedInvite.role)}
                    <span className="font-medium text-slate-900 dark:text-white">{selectedInvite.role}</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs text-slate-500">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedInvite.status)}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs text-slate-500">Invited By</p>
                  <p className="font-medium text-sm text-slate-900 dark:text-white mt-1">{selectedInvite.invitedBy}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs text-slate-500">Expires</p>
                  <p className="font-medium text-sm text-slate-900 dark:text-white mt-1">{formatDate(selectedInvite.expiresAt)}</p>
                </div>
              </div>

              {selectedInvite.status === "PENDING" && (
                <div className="space-y-2">
                  <Label>Invite Link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={`${window.location.origin}/invite/accept/${selectedInvite.token}`}
                      readOnly
                      className="text-xs flex-1"
                    />
                    <Button variant="outline" size="sm" onClick={() => handleCopyLink(selectedInvite.token)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <DialogFooter className="flex gap-2">
                {selectedInvite.status === "PENDING" && (
                  <>
                    <Button variant="outline" className="rounded-xl flex-1 text-blue-600"
                      onClick={() => handleResendInvite(selectedInvite.id)}
                      disabled={actionLoading === selectedInvite.id}>
                      <RefreshCw className="h-4 w-4 mr-2" /> Resend
                    </Button>
                    <Button variant="outline" className="rounded-xl flex-1 text-red-600"
                      onClick={() => handleCancelInvite(selectedInvite.id)}
                      disabled={actionLoading === selectedInvite.id}>
                      <XCircle className="h-4 w-4 mr-2" /> Cancel
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