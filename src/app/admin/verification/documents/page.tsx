"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";

/**
 * Admin Verification Documents sub-page
 * 
 * Per-document review has been merged into the main verification page's
 * station detail dialog. This page now redirects there.
 */
export default function AdminVerificationDocumentsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/verification");
  }, [router]);

  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
        <p className="text-sm text-slate-500">Redirecting to verification dashboard...</p>
      </div>
    </div>
  );
}
