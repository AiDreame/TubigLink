"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Users, UserPlus, Search, Mail, MoreVertical, Loader2,
  CheckCircle2, XCircle, Clock, Copy, RefreshCw, Ban,
  Shield, ShieldCheck, ShieldAlert, Key, Trash2,
  AlertTriangle, Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card, CardContent,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ALL_PERMISSIONS,
  STAFF_DEFAULT_PERMISSIONS,
  MANAGER_DEFAULT_PERMISSIONS,
  DRIVER_DEFAULT_PERMISSIONS,
  getDefaultPermissions,
} from "@/lib/permissions";
import toast from "react-hot-toast";

type StaffStatus = "ACTIVE" | "INVITED" | "SUSPENDED" | "DEACTIVATED";
type StaffRole = "MANAGER" | "STAFF" | "ADMIN" | "DRIVER";

interface StaffMember {
  id: string; name: string; email: string; phone: string;
  role: StaffRole; status: StaffStatus; permissions: string[];
  invitedAt: string; lastActive: string | null;
}

// Group permissions by module for display
const PERMISSION_MODULES = ALL_PERMISSIONS.reduce<Record<string, typeof ALL_PERMISSIONS>>((acc, p) => {
  if (!acc[p.module]) acc[p.module] = [];
  acc[p.module].push(p);
  return acc;
}, {});

const MODULE_LABELS: Record<string, string> = {
  orders: "Orders", products: "Products", customers: "Customers",
  earnings: "Earnings", analytics: "Analytics",
  delivery_zones: "Delivery Zones", settings: "Settings", staff: "Staff",
};

const ALL_PERMISSION_KEYS = ALL_PERMISSIONS.map((p) => p.key);

const ADMIN_DEFAULT_PERMISSIONS = Array.from(new Set([...MANAGER_DEFAULT_PERMISSIONS, "staff:manage"]));

const ROLE_DEFAULTS: Record<StaffRole, string[]> = {
  ADMIN: ADMIN_DEFAULT_PERMISSIONS,
  MANAGER: [...MANAGER_DEFAULT_PERMISSIONS],
  STAFF: [...STAFF_DEFAULT_PERMISSIONS],
  DRIVER: [...DRIVER_DEFAULT_PERMISSIONS],
};

// ── Helpers ──────────────────────────────────────────────

/** Map API staff object to frontend StaffMember */
function mapApiStaffToMember(raw: Record<string, any>): StaffMember {
  let permissions: string[] = [];
  if (Array.isArray(raw.permissionList)) {
    permissions = raw.permissionList;
  } else if (typeof raw.permissions === "string") {
    try { permissions = JSON.parse(raw.permissions); } catch { permissions = []; }
  }

  return {
    id: raw.id,
    name: raw.name || raw.user?.name || raw.email || "Unknown",
    email: raw.email || raw.user?.email || "",
    phone: raw.phone || raw.user?.phone || "",
    role: (raw.role === "ADMIN" ? "ADMIN" : raw.role === "MANAGER" ? "MANAGER" : raw.role === "DRIVER" ? "DRIVER" : "STAFF") as StaffRole,
    status: raw.status as StaffStatus,
    permissions,
    invitedAt: raw.invitedAt || raw.createdAt || new Date().toISOString(),
    lastActive: raw.user?.updatedAt || raw.updatedAt || null,
  };
}

// ── Page Component ───────────────────────────────────────

export default function DashboardStaffPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  // ── State ──
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Invite dialog
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState<StaffRole>("STAFF");
  const [invitePermissions, setInvitePermissions] = useState<string[]>([]);
  const [isInviting, setIsInviting] = useState(false);

  // Detail dialog
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);

  // ── Fetch staff ──
  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/station/staff");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to fetch staff");
      const mapped: StaffMember[] = (json.data || []).map(mapApiStaffToMember);
      setStaff(mapped);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Failed to load staff");
      setStaff([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session) { router.push("/auth/login"); return; }
    fetchStaff();
  }, [session, sessionStatus, router, fetchStaff]);

  // Set default permissions when role changes in invite dialog
  useEffect(() => {
    setInvitePermissions([...ROLE_DEFAULTS[inviteRole]]);
  }, [inviteRole]);

  // ── Badge helpers ──
  const getRoleBadge = (role: StaffRole) => {
    const styles: Record<StaffRole, string> = {
      ADMIN: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
      MANAGER: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
      STAFF: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
      DRIVER: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800",
    };
    return <Badge variant="outline" className={`${styles[role]} font-medium`}>{role}</Badge>;
  };

  const getStatusBadge = (status: StaffStatus) => {
    const styles: Record<string, string> = {
      ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
      SUSPENDED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
      INVITED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
      DEACTIVATED: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700",
    };
    return <Badge variant="outline" className={`${styles[status]} font-medium`}>{status}</Badge>;
  };

  const getRoleIcon = (role: StaffRole) => {
    switch (role) {
      case "ADMIN": return <ShieldAlert className="h-4 w-4 text-purple-500" />;
      case "MANAGER": return <ShieldCheck className="h-4 w-4 text-indigo-500" />;
      case "STAFF": return <Shield className="h-4 w-4 text-blue-500" />;
      case "DRIVER": return <Truck className="h-4 w-4 text-teal-500" />;
    }
  };

  // ── Filtering ──
  const filteredStaff = staff.filter((s) =>
    searchTerm === "" || s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Permission toggles ──
  const togglePermission = (permKey: string) => {
    setInvitePermissions((prev) =>
      prev.includes(permKey) ? prev.filter((p) => p !== permKey) : [...prev, permKey]
    );
  };

  const toggleEditPermission = (permKey: string) => {
    setEditPermissions((prev) =>
      prev.includes(permKey) ? prev.filter((p) => p !== permKey) : [...prev, permKey]
    );
  };

  const areAllModulePermissionsSelected = (module: string, permList: string[]) => {
    const modulePerms = ALL_PERMISSIONS.filter((p) => p.module === module).map((p) => p.key);
    return modulePerms.every((k) => permList.includes(k));
  };

  const toggleModule = (module: string, isInvite: boolean) => {
    const moduleKeys = ALL_PERMISSIONS.filter((p) => p.module === module).map((p) => p.key) as string[];
    const currentList = isInvite ? invitePermissions : editPermissions;
    const allSelected = moduleKeys.every((k) => currentList.includes(k));
    const newList = allSelected
      ? currentList.filter((p) => !moduleKeys.includes(p as string))
      : Array.from(new Set([...currentList, ...moduleKeys]));
    if (isInvite) setInvitePermissions(newList);
    else setEditPermissions(newList);
  };

  // ── Actions ──

  const handleInvite = async () => {
    if (!inviteEmail) { toast.error("Email is required."); return; }
    if (!inviteEmail.includes("@")) { toast.error("Please enter a valid email."); return; }
    setIsInviting(true);
    try {
      const res = await fetch("/api/station/staff/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          name: inviteName || undefined,
          phone: invitePhone || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to send invitation");
      toast.success(json.message || "Invitation sent!");
      setShowInviteDialog(false);
      setInviteName(""); setInviteEmail(""); setInvitePhone("");
      setInviteRole("STAFF"); setInvitePermissions([...STAFF_DEFAULT_PERMISSIONS]);
      await fetchStaff();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const handleSuspend = async (staffId: string) => {
    setActionLoading(staffId);
    try {
      const res = await fetch(`/api/station/staff/${staffId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SUSPENDED" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to suspend staff");
      toast.success("Staff member suspended.");
      await fetchStaff();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to suspend");
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async (staffId: string) => {
    setActionLoading(staffId);
    try {
      const res = await fetch(`/api/station/staff/${staffId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to activate staff");
      toast.success("Staff member activated.");
      await fetchStaff();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to activate");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (staffId: string) => {
    setActionLoading(staffId);
    try {
      const res = await fetch(`/api/station/staff/${staffId}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to remove staff");
      toast.success("Staff member removed.");
      setDeleteTarget(null);
      await fetchStaff();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove staff");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedStaff) return;
    setActionLoading("save-perms");
    try {
      const res = await fetch(`/api/station/staff/${selectedStaff.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: editPermissions }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save permissions");
      toast.success("Permissions updated!");
      await fetchStaff();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save permissions");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendInvite = async (staffId: string) => {
    // Re-use the invite endpoint? No — resend isn't a separate endpoint.
    // Show the invite token link instead.
    const member = staff.find((s) => s.id === staffId);
    if (!member) return;
    const link = `${window.location.origin}/auth/invite?email=${encodeURIComponent(member.email)}`;
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied! Share it with the staff member.");
  };

  const handleCopyInviteLink = (email: string) => {
    const link = `${window.location.origin}/auth/invite?email=${encodeURIComponent(email)}`;
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied!");
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  // ── Permission checkbox renderer ──
  const renderPermissionCheckboxes = (permList: string[], isInvite: boolean) => {
    const toggle = isInvite ? togglePermission : toggleEditPermission;
    const toggleMod = (module: string) => toggleModule(module, isInvite);

    return (
      <div className="border border-border rounded-xl divide-y divide-border max-h-[380px] overflow-y-auto">
        {Object.entries(PERMISSION_MODULES).map(([module, perms]) => {
          const allSelected = areAllModulePermissionsSelected(module, permList);
          return (
            <div key={module} className="p-3">
              <label className="flex items-center gap-2 cursor-pointer min-h-[40px] mb-1.5">
                <Checkbox checked={allSelected} onCheckedChange={() => toggleMod(module)} />
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {MODULE_LABELS[module] || module}
                </span>
                <span className="text-xs text-gray-400 ml-auto">
                  {perms.filter((p) => permList.includes(p.key)).length}/{perms.length}
                </span>
              </label>
              <div className="space-y-1.5 pl-6">
                {perms.map((perm) => (
                  <label key={perm.key} className="flex items-center gap-2 cursor-pointer min-h-[32px]">
                    <Checkbox checked={permList.includes(perm.key)} onCheckedChange={() => toggle(perm.key)} className="h-4 w-4" />
                    <div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{perm.label}</span>
                      <p className="text-xs text-gray-400">{perm.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Loading ──
  if (sessionStatus === "loading") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm text-gray-500">Checking session...</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (fetchError) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-14 w-14 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-7 w-7 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Failed to load staff</h3>
            <p className="text-sm text-gray-500 mt-1">{fetchError}</p>
          </div>
          <Button onClick={fetchStaff} variant="outline" className="rounded-xl">
            <RefreshCw className="h-4 w-4 mr-2" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  // ── Main UI ──
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Staff Management</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your team and their granular permissions</p>
        </div>
        <Button className="rounded-xl bg-blue-600 hover:bg-blue-700" onClick={() => setShowInviteDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" /> Invite Staff
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Staff", value: staff.length, icon: Users, color: "text-blue-600" },
          { label: "Active", value: staff.filter((s) => s.status === "ACTIVE").length, icon: CheckCircle2, color: "text-green-600" },
          { label: "Invited", value: staff.filter((s) => s.status === "INVITED").length, icon: Mail, color: "text-blue-500" },
          { label: "Suspended", value: staff.filter((s) => s.status === "SUSPENDED").length, icon: Ban, color: "text-red-600" },
        ].map((stat) => (
          <Card key={stat.label} className="bg-white dark:bg-gray-800/50 border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input placeholder="Search staff by name, email, or ID..." value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 rounded-xl bg-white dark:bg-gray-800/50" />
      </div>

      {/* Staff Table */}
      <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-sm text-gray-500">Loading staff...</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Staff</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Role</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider hidden md:table-cell">Status</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider hidden lg:table-cell">Last Active</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-gray-500">
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="font-medium">No staff members yet</p>
                    <p className="text-xs mt-1">Invite your first team member to get started.</p>
                  </TableCell></TableRow>
                ) : (
                  filteredStaff.map((member) => (
                    <TableRow key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer"
                      onClick={() => { setSelectedStaff(member); setEditPermissions([...member.permissions]); }}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
                            {(member.name || "?").split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-gray-900 dark:text-white">{member.name}</p>
                            <p className="text-xs text-gray-500">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">{getRoleIcon(member.role)}<span className="text-sm">{member.role}</span></div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{getStatusBadge(member.status)}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-gray-500">{formatDate(member.lastActive)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="min-h-[36px] min-w-[36px]"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedStaff(member); setEditPermissions([...member.permissions]); }}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {member.status === "INVITED" && (
                              <>
                                <DropdownMenuItem onClick={() => handleResendInvite(member.id)}>
                                  <RefreshCw className="h-4 w-4 mr-2" /> Resend Invite
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCopyInviteLink(member.email)}>
                                  <Copy className="h-4 w-4 mr-2" /> Copy Invite Link
                                </DropdownMenuItem>
                              </>
                            )}
                            {member.status === "ACTIVE" && (
                              <DropdownMenuItem onClick={() => handleSuspend(member.id)} disabled={actionLoading === member.id} className="text-red-600">
                                <Ban className="h-4 w-4 mr-2" /> Suspend
                              </DropdownMenuItem>
                            )}
                            {member.status === "SUSPENDED" && (
                              <DropdownMenuItem onClick={() => handleActivate(member.id)} disabled={actionLoading === member.id}>
                                <RefreshCw className="h-4 w-4 mr-2" /> Reactivate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteTarget(member)} disabled={actionLoading === member.id} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" /> Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* ── Invite Dialog ── */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2"><UserPlus className="h-5 w-5 text-blue-600" /> Invite Staff Member</DialogTitle>
            <DialogDescription>Add a team member with granular permissions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name (optional)</Label>
              <Input placeholder="Juan dela Cruz" value={inviteName} onChange={(e) => setInviteName(e.target.value)} className="min-h-[44px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="juan@email.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="min-h-[44px]" />
              </div>
              <div className="space-y-2">
                <Label>Phone (optional)</Label>
                <Input type="tel" placeholder="0917XXXXXXX" value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} className="min-h-[44px]" />
              </div>
            </div>
            {/* Role Selector */}
            <div className="space-y-2">
              <Label>Role</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["ADMIN", "MANAGER", "STAFF", "DRIVER"] as StaffRole[]).map((role) => (
                  <button key={role} type="button" onClick={() => setInviteRole(role)}
                    className={`p-3 rounded-xl border text-center transition-all min-h-[60px] ${
                      inviteRole === role
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-700"
                        : "border-border hover:border-blue-300 dark:hover:border-blue-700"
                    }`}>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{role}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {role === "ADMIN" ? "Full access" : role === "MANAGER" ? "Extended" : role === "DRIVER" ? "Delivery" : "Limited"}
                    </p>
                  </button>
                ))}
              </div>
            </div>
            {/* Granular Permissions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Granular Permissions</Label>
                <span className="text-xs text-gray-500">{invitePermissions.length} of {ALL_PERMISSIONS.length} selected</span>
              </div>
              {renderPermissionCheckboxes(invitePermissions, true)}
              <p className="text-xs text-gray-400 mt-1">Roles auto-select defaults. Toggle individual permissions for fine-grained access.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleInvite} disabled={isInviting} className="rounded-xl bg-blue-600 hover:bg-blue-700">
              {isInviting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending...</> : <><Mail className="h-4 w-4 mr-2" /> Send Invitation</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Staff Detail Dialog ── */}
      <Dialog open={!!selectedStaff} onOpenChange={(open) => { if (!open) setSelectedStaff(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedStaff && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg">
                    {(selectedStaff.name || "?").split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{selectedStaff.name}</DialogTitle>
                    <DialogDescription>{selectedStaff.id} • {selectedStaff.email} • {getStatusBadge(selectedStaff.status)}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <Tabs defaultValue="details">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="permissions">Permissions ({editPermissions.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="space-y-3 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-xs text-gray-500">Role</p>
                      <div className="flex items-center gap-2 mt-1">{getRoleIcon(selectedStaff.role)}<span className="font-medium">{selectedStaff.role}</span></div>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="font-medium text-sm mt-1">{selectedStaff.phone || "—"}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-xs text-gray-500">Invited</p>
                      <p className="font-medium text-sm mt-1">{formatDate(selectedStaff.invitedAt)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-xs text-gray-500">Last Active</p>
                      <p className="font-medium text-sm mt-1">{formatDate(selectedStaff.lastActive)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    {selectedStaff.status === "ACTIVE" && (
                      <Button variant="outline" className="rounded-xl flex-1 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleSuspend(selectedStaff.id)} disabled={actionLoading === selectedStaff.id}>
                        <Ban className="h-4 w-4 mr-2" /> Suspend
                      </Button>
                    )}
                    {selectedStaff.status === "SUSPENDED" && (
                      <Button variant="outline" className="rounded-xl flex-1"
                        onClick={() => handleActivate(selectedStaff.id)} disabled={actionLoading === selectedStaff.id}>
                        <RefreshCw className="h-4 w-4 mr-2" /> Reactivate
                      </Button>
                    )}
                    {selectedStaff.status === "INVITED" && (
                      <>
                        <Button variant="outline" className="rounded-xl flex-1" onClick={() => handleResendInvite(selectedStaff.id)}>
                          <RefreshCw className="h-4 w-4 mr-2" /> Resend
                        </Button>
                        <Button variant="outline" className="rounded-xl flex-1" onClick={() => handleCopyInviteLink(selectedStaff.email)}>
                          <Copy className="h-4 w-4 mr-2" /> Copy Link
                        </Button>
                      </>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="permissions" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Permission Scopes</p>
                    <span className="text-xs text-gray-500">{editPermissions.length} of {ALL_PERMISSIONS.length}</span>
                  </div>
                  {renderPermissionCheckboxes(editPermissions, false)}
                  <Button onClick={handleSavePermissions} disabled={actionLoading === "save-perms"}
                    className="w-full rounded-xl bg-blue-600 hover:bg-blue-700">
                    {actionLoading === "save-perms" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
                    Save Permissions
                  </Button>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-2">
              <Trash2 className="h-6 w-6 text-red-500" />
            </div>
            <DialogTitle className="text-center text-lg">Remove Staff Member</DialogTitle>
            <DialogDescription className="text-center">
              Are you sure you want to remove <strong>{deleteTarget?.name}</strong>? This will deactivate their access to the station.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-center">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTarget && handleRemove(deleteTarget.id)}
              disabled={actionLoading === deleteTarget?.id} className="rounded-xl">
              {actionLoading === deleteTarget?.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
