"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  ArrowLeft,
  User,
  Bell,
  Shield,
  Smartphone,
  Moon,
  Globe,
  ChevronRight,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { MESSAGES } from "@/lib/constants";

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const userPhone = (session?.user as any)?.phone as string | undefined;
  const confirmed = confirmText.trim() === "DELETE";

  const handleDelete = async () => {
    if (!confirmed || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/me", { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body?.error || "Could not delete your account.");
        setDeleting(false);
        return;
      }
      setDeleteOpen(false);
      toast.success("Your account has been deleted.");
      await signOut({ redirect: false });
      router.push("/account-deleted");
    } catch {
      toast.error("Something went wrong. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card sticky top-0 z-30 border-b border-border px-4 py-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full min-h-[44px] min-w-[44px]" onClick={() => router.back()} aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-card-foreground">{MESSAGES.settings}</h1>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-6">
        {/* Account Section */}
        <section className="space-y-3" aria-label="Account settings">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2">Account Settings</h2>
          <div className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm">
            <button className="w-full p-4 flex items-center justify-between hover:bg-muted cursor-pointer border-b border-border min-h-[56px]" aria-label="Edit profile">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <User className="h-5 w-5" aria-hidden="true" />
                </div>
                <span className="font-bold text-card-foreground">Edit Profile</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/50" aria-hidden="true" />
            </button>
            <button className="w-full p-4 flex items-center justify-between hover:bg-muted cursor-pointer border-b border-border min-h-[56px]" aria-label="Phone verification">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center">
                  <Smartphone className="h-5 w-5" aria-hidden="true" />
                </div>
                <span className="font-bold text-card-foreground">Phone Verification</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-600 dark:text-green-400 font-bold">Verified</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground/50" aria-hidden="true" />
              </div>
            </button>
            <button className="w-full p-4 flex items-center justify-between hover:bg-muted cursor-pointer min-h-[56px]" aria-label="Security and password">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Shield className="h-5 w-5" aria-hidden="true" />
                </div>
                <span className="font-bold text-card-foreground">Security & Password</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/50" aria-hidden="true" />
            </button>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="space-y-3" aria-label="Notification settings">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2">Notifications</h2>
          <div className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm p-2">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 flex items-center justify-center">
                  <Bell className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-bold text-card-foreground">Push Notifications</p>
                  <p className="text-[10px] text-muted-foreground">Order updates and reminders</p>
                </div>
              </div>
              <Switch defaultChecked aria-label="Toggle push notifications" />
            </div>
            <Separator className="mx-4 w-auto" />
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                  <Bell className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-bold text-card-foreground">Promotions</p>
                  <p className="text-[10px] text-muted-foreground">Discounts and special offers</p>
                </div>
              </div>
              <Switch aria-label="Toggle promotional notifications" />
            </div>
          </div>
        </section>

        {/* Preferences Section */}
        <section className="space-y-3" aria-label="Preferences">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2">Preferences</h2>
          <div className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm p-2">
            <div className="p-4 flex items-center justify-between border-b border-border min-h-[56px]">
              <ThemeToggle asSwitch />
            </div>
            <button className="w-full p-4 flex items-center justify-between hover:bg-muted cursor-pointer min-h-[56px]" aria-label="Language settings">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Globe className="h-5 w-5" aria-hidden="true" />
                </div>
                <span className="font-bold text-card-foreground">Language</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">English (PH)</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground/50" aria-hidden="true" />
              </div>
            </button>
          </div>
        </section>

        <p className="text-center text-sm text-muted-foreground">
          Read our{" "}
          <Link href="/privacy" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
            Privacy Policy
          </Link>
        </p>

        <Button
          variant="ghost"
          className="w-full text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-300 font-bold min-h-[44px]"
          aria-label="Delete account"
          onClick={() => {
            setConfirmText("");
            setDeleteOpen(true);
          }}
        >
          Delete Account
        </Button>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>
                This permanently deletes your account and personal data.
                {userPhone ? (
                  <>
                    {" "}Account: <span className="font-bold">{userPhone}</span>.
                  </>
                ) : null}{" "}
                Orders and business records are kept for legal purposes with
                your personal details removed. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                To confirm, type <span className="font-bold text-card-foreground">DELETE</span> below.
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                aria-label="Type DELETE to confirm account deletion"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={!confirmed || deleting}
                aria-label="Confirm account deletion"
              >
                {deleting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Deleting…
                  </span>
                ) : (
                  "Delete my account"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
