"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  Shield,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  ArrowRight,
  UserPlus,
  Droplets,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import toast from "react-hot-toast";

type InviteStatus = "loading" | "valid" | "expired" | "accepted" | "error";
type StaffRole = "ADMIN" | "MODERATOR" | "SUPPORT" | "VIEWER";

interface InviteData {
  email: string;
  role: StaffRole;
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  status: InviteStatus;
  message?: string;
}

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string;

  const [inviteStatus, setInviteStatus] = useState<InviteStatus>("loading");
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);

  // Simulated invite verification
  useEffect(() => {
    if (!token) {
      setInviteStatus("error");
      return;
    }

    const timer = setTimeout(() => {
      // Placeholder — will be replaced with API call
      const mockInvite: InviteData = {
        email: "newstaff@aqualink.ph",
        role: "MODERATOR",
        invitedBy: "Maria Santos",
        invitedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: "valid",
        message: "Hi! I'd like to invite you to join the AquaLink PH admin team as a Moderator. Looking forward to working with you!",
      };
      setInvite(mockInvite);
      setInviteStatus("valid");
    }, 1500);

    return () => clearTimeout(timer);
  }, [token]);

  const handleAccept = async () => {
    if (!name || !phone || !password) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsAccepting(true);
    // Placeholder — will be replaced with actual API call: POST /api/invite/accept
    await new Promise((r) => setTimeout(r, 2000));
    setInviteStatus("accepted");
    setIsAccepting(false);
    toast.success("Welcome to AquaLink PH! Your account has been created.");
  };

  const handleDecline = async () => {
    setIsAccepting(true);
    await new Promise((r) => setTimeout(r, 1000));
    router.push("/");
    toast("Invitation declined.", { icon: "📧" });
  };

  const getRoleIcon = (role: StaffRole) => {
    switch (role) {
      case "ADMIN": return <ShieldAlert className="h-5 w-5 text-red-500" />;
      case "MODERATOR": return <ShieldCheck className="h-5 w-5 text-blue-500" />;
      case "SUPPORT": return <Shield className="h-5 w-5 text-green-500" />;
      default: return <Shield className="h-5 w-5 text-slate-400" />;
    }
  };

  const getRoleLabel = (role: StaffRole) => {
    const labels: Record<StaffRole, string> = {
      ADMIN: "Administrator",
      MODERATOR: "Moderator",
      SUPPORT: "Support Agent",
      VIEWER: "Viewer (Read-only)",
    };
    return labels[role];
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
  };

  // Loading state
  if (inviteStatus === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
          <p className="text-slate-600 dark:text-slate-400">Verifying your invitation...</p>
        </div>
      </div>
    );
  }

  // Error / Invalid
  if (inviteStatus === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-none shadow-lg">
          <CardContent className="p-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Invalid Invitation</h2>
            <p className="text-sm text-slate-500">
              This invitation link is invalid or has expired. Please contact the person who invited you for a new link.
            </p>
            <Button asChild className="rounded-xl mt-4">
              <Link href="/">Go to AquaLink PH</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Accepted
  if (inviteStatus === "accepted") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-green-900/20 dark:to-gray-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-none shadow-lg">
          <CardContent className="p-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Welcome to the Team! 🎉</h2>
            <p className="text-sm text-slate-500">
              Your account has been created successfully. You can now log in with your credentials.
            </p>
            <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-4 border border-green-100 dark:border-green-800/50">
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">{invite?.email}</p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">Role: {invite ? getRoleLabel(invite.role) : ""}</p>
            </div>
            <Button asChild className="rounded-xl mt-4 bg-green-600 hover:bg-green-700">
              <Link href="/auth/login">Log In Now</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid — Show the form
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4 py-12">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
            <UserPlus className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">You're Invited!</h1>
          <p className="text-muted-foreground mt-1">
            Join the AquaLink PH team
          </p>
        </div>

        {/* Invite Info Card */}
        {invite && (
          <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-sm text-slate-900 dark:text-white">{invite.email}</p>
                  <p className="text-xs text-slate-500">Invited by {invite.invitedBy}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {getRoleIcon(invite.role)}
                <div>
                  <p className="font-medium text-sm text-slate-900 dark:text-white">{getRoleLabel(invite.role)}</p>
                  <p className="text-xs text-slate-500">Role</p>
                </div>
              </div>

              {invite.message && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-sm text-slate-600 dark:text-slate-400 italic border dark:border-slate-700">
                  &ldquo;{invite.message}&rdquo;
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-border">
                <Clock className="h-3 w-3" />
                Invited {formatDate(invite.invitedAt)} • Expires {formatDate(invite.expiresAt)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Account Form */}
        <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50">
          <CardContent className="p-5 space-y-4">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Create Your Account</h3>
            <p className="text-sm text-slate-500">Set up your credentials to accept the invitation</p>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Juan dela Cruz"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="min-h-[48px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="0917XXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="min-h-[48px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={invite?.email || ""}
                readOnly
                disabled
                className="min-h-[48px] bg-slate-50 dark:bg-slate-800/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                className="min-h-[48px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
                className="min-h-[48px]"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleDecline}
                disabled={isAccepting}
                className="rounded-xl flex-1 min-h-[48px]"
              >
                Decline
              </Button>
              <Button
                onClick={handleAccept}
                disabled={isAccepting}
                className="rounded-xl flex-1 min-h-[48px] bg-green-600 hover:bg-green-700"
              >
                {isAccepting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating account...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Accept & Join
                  </span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          By accepting, you agree to AquaLink PH's terms and conditions.
        </p>
      </div>
    </div>
  );
}