"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Mail, Shield, ShieldCheck, ShieldAlert, UserCheck,
  CheckCircle2, XCircle, Loader2, Clock, UserPlus, Droplets,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent,
} from "@/components/ui/card";
import {
  ALL_PERMISSIONS,
  STAFF_DEFAULT_PERMISSIONS,
  MANAGER_DEFAULT_PERMISSIONS,
} from "@/lib/permissions";
import toast from "react-hot-toast";

type StaffRole = "MANAGER" | "STAFF" | "VIEWER";

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

function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email");

  const [isLoading, setIsLoading] = useState(true);
  const [inviteValid, setInviteValid] = useState(false);
  const [inviteEmail, setInviteEmail] = useState(emailParam || "");
  const [inviteRole, setInviteRole] = useState<StaffRole>("STAFF");
  const [inviterName, setInviterName] = useState("");
  const [stationName, setStationName] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setInviteEmail(emailParam || "staff@example.com");
      setInviteRole("STAFF");
      setInviterName("Maria Santos");
      setStationName("AquaPure Makati");
      setPermissions([...STAFF_DEFAULT_PERMISSIONS]);
      setInviteValid(true);
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [emailParam]);

  const handleAccept = async () => {
    if (!name || !password) { toast.error("Name and password are required."); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { toast.error("Passwords do not match."); return; }
    setIsAccepting(true);
    await new Promise((r) => setTimeout(r, 2000));
    setAccepted(true);
    setIsAccepting(false);
    toast.success("Welcome! Your account has been created.");
  };

  const getRoleIcon = (role: StaffRole) => {
    switch (role) {
      case "MANAGER": return <ShieldAlert className="h-5 w-5 text-purple-500" />;
      case "STAFF": return <ShieldCheck className="h-5 w-5 text-blue-500" />;
      case "VIEWER": return <Shield className="h-5 w-5 text-slate-400" />;
    }
  };

  const getRoleLabel = (role: StaffRole) => {
    const labels: Record<StaffRole, string> = { MANAGER: "Manager", STAFF: "Staff", VIEWER: "Viewer (Read-only)" };
    return labels[role];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-500">Verifying your invitation...</p>
        </div>
      </div>
    );
  }

  if (!inviteValid) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-none shadow-lg">
          <CardContent className="p-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Invalid Invitation</h2>
            <p className="text-sm text-gray-500">This invitation link is invalid or has expired.</p>
            <Button asChild className="rounded-xl mt-4"><Link href="/">Go to AquaLink PH</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-green-900/20 dark:to-gray-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-none shadow-lg">
          <CardContent className="p-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Welcome to the Team! 🎉</h2>
            <p className="text-sm text-gray-500">You've been added as a {getRoleLabel(inviteRole)} at {stationName}.</p>
            <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-4 border border-green-100 dark:border-green-800/50">
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">{inviteEmail}</p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">{stationName}</p>
            </div>
            <Button asChild className="rounded-xl mt-4 bg-green-600 hover:bg-green-700">
              <Link href="/auth/login">Log In to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4 py-12">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
            <UserPlus className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">You're Invited!</h1>
          <p className="text-muted-foreground mt-1">Join {stationName} on AquaLink PH</p>
        </div>

        <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b">
              <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-sm text-gray-900 dark:text-white">{inviteEmail}</p>
                <p className="text-xs text-gray-500">Invited by {inviterName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getRoleIcon(inviteRole)}
              <div>
                <p className="font-medium text-sm text-gray-900 dark:text-white">{getRoleLabel(inviteRole)}</p>
                <p className="text-xs text-gray-500">at {stationName}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 dark:text-white">Your Permissions</h3>
              <span className="text-xs text-gray-500">{permissions.length} scopes</span>
            </div>
            <div className="space-y-3">
              {Object.entries(PERMISSION_MODULES).map(([module, perms]) => {
                const granted = perms.filter((p) => permissions.includes(p.key));
                if (granted.length === 0) return null;
                return (
                  <div key={module}>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{MODULE_LABELS[module] || module}</p>
                    <div className="space-y-1">
                      {granted.map((perm) => (
                        <div key={perm.key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          <span>{perm.label}</span>
                          <span className="text-xs text-gray-400">— {perm.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50">
          <CardContent className="p-5 space-y-4">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Create Your Account</h3>
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input placeholder="Juan dela Cruz" value={name} onChange={(e) => setName(e.target.value)} required className="min-h-[48px]" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={inviteEmail} readOnly disabled className="min-h-[48px] bg-gray-50 dark:bg-gray-800/50" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" placeholder="Min. 6 characters" value={password}
                onChange={(e) => setPassword(e.target.value)} minLength={6} required className="min-h-[48px]" />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input type="password" placeholder="Re-enter password" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} minLength={6} required className="min-h-[48px]" />
            </div>
            <Button onClick={handleAccept} disabled={isAccepting}
              className="w-full rounded-xl min-h-[52px] bg-green-600 hover:bg-green-700">
              {isAccepting ? <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Creating account...</> : <><UserCheck className="h-5 w-5 mr-2" /> Accept & Join</>}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-500">Verifying your invitation...</p>
        </div>
      </div>
    }>
      <InviteContent />
    </Suspense>
  );
}
