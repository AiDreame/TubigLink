import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AccountDeletedPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="p-4">
        <Link href="/" aria-label="Back to home">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full min-h-[44px] min-w-[44px]"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
      </div>
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 pb-20 gap-4">
        <CheckCircle2
          className="h-16 w-16 text-green-600 dark:text-green-400"
          aria-hidden="true"
        />
        <h1 className="text-2xl font-bold text-card-foreground">
          Your account has been deleted
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          Your personal details have been removed. Past orders and business
          records are kept for legal purposes with your personal information
          taken out. We&apos;re sorry to see you go — you&apos;re welcome back
          anytime.
        </p>
        <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
          <Link href="/auth/register">
            <Button className="w-full min-h-[44px]">Create a new account</Button>
          </Link>
          <Link href="/privacy">
            <Button variant="ghost" className="w-full min-h-[44px]">
              Read our Privacy Policy
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
