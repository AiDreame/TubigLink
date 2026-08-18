"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Droplets, Phone, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import { MESSAGES } from "@/lib/constants";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  // N-06 (security audit 2026-08-18): never redirect to an external origin.
  // Only relative paths (or same-origin absolute URLs) are honored; anything
  // else (https://evil.example, //host, javascript:, backslash tricks) falls
  // back to "/".
  function safeCallbackUrl(raw: string): string {
    if (raw === "/") return raw;
    // Relative paths only: starts with exactly one "/", no protocol-relative
    // ("//"), no backslashes, no spaces/control chars (browser URL
    // normalization would otherwise turn "\evil.com" into "//evil.com").
    if (
      raw.startsWith("/") &&
      !raw.startsWith("//") &&
      !/[\x00-\x20\\]/.test(raw)
    ) {
      return raw;
    }
    try {
      const url = new URL(raw, window.location.origin);
      if (url.origin === window.location.origin) {
        return url.pathname + url.search + url.hash;
      }
    } catch {
      // fall through to "/"
    }
    return "/";
  }

  const safeCb = safeCallbackUrl(callbackUrl);

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [otp, setOtp] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        phone,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid credentials. Please try again.");
      } else {
        toast.success("Welcome back! Magandang araw!");
        // Logged in — get their role to redirect correctly
        fetch("/api/auth/session")
          .then((r) => r.json())
          .then((session) => {
            const role = session?.user?.role;
            if (callbackUrl && callbackUrl !== "/") {
              router.push(safeCb);
            } else if (role === "PROVIDER") {
              router.push("/dashboard");
            } else if (role === "ADMIN") {
              router.push("/admin");
            } else {
              router.push("/");
            }
          })
          .catch(() => router.push(safeCb));
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        phone,
        password: otp,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid OTP. Please try again.");
      } else {
        toast.success("Login successful! Tuloy po kayo!");
        fetch("/api/auth/session")
          .then((r) => r.json())
          .then((session) => {
            const role = session?.user?.role;
            if (callbackUrl && callbackUrl !== "/") {
              router.push(safeCb);
            } else if (role === "PROVIDER") {
              router.push("/dashboard");
            } else if (role === "ADMIN") {
              router.push("/admin");
            } else {
              router.push("/");
            }
          })
          .catch(() => router.push(safeCb));
      }
    } catch (error) {
      toast.error("Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = async () => {
    if (!phone || phone.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }
    toast.success("OTP sent to your phone (demo: 123456)");
    setIsOtpMode(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 flex flex-col">
      {/* Back link */}
      <div className="p-4">
        <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline min-h-[44px] inline-flex items-center" aria-label="Go back to home">
          ← Back to Home
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-20">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="text-center">
            <div className="h-16 w-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4" aria-hidden="true">
              <Droplets className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">{MESSAGES.welcomeBack}</h1>
            <p className="text-muted-foreground mt-1">
              {MESSAGES.loginDesc}
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-card rounded-2xl shadow-sm border border-border p-6 space-y-6">
            {!isOtpMode ? (
              <form onSubmit={handleLogin} className="space-y-4" aria-label="Login form">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-card-foreground">{MESSAGES.phoneNumber}</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="0917XXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10"
                      required
                      aria-label="Phone number"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-card-foreground">{MESSAGES.password}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                      aria-label="Password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full rounded-xl min-h-[44px]"
                  size="lg"
                  disabled={isLoading}
                  aria-label={isLoading ? MESSAGES.loggingIn : MESSAGES.logIn}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {MESSAGES.loggingIn}
                    </span>
                  ) : (
                    MESSAGES.logIn
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-xl min-h-[44px]"
                  size="lg"
                  onClick={sendOtp}
                  aria-label="Log in with OTP"
                >
                  {MESSAGES.loginWithOtp}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleOtpLogin} className="space-y-4" aria-label="OTP verification form">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    {MESSAGES.enterOtp}{" "}
                    <span className="font-medium text-card-foreground">{phone}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsOtpMode(false)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 min-h-[44px] inline-flex items-center"
                    aria-label="Change phone number"
                  >
                    {MESSAGES.changeNumber}
                  </button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-card-foreground">{MESSAGES.otpCode}</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="text-center text-2xl tracking-widest"
                    maxLength={6}
                    required
                    aria-label="Enter 6-digit OTP code"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Demo: Enter any 6 digits
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full rounded-xl min-h-[44px]"
                  size="lg"
                  disabled={isLoading || otp.length < 6}
                  aria-label={isLoading ? MESSAGES.verifying : MESSAGES.verifyOtp}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {MESSAGES.verifying}
                    </span>
                  ) : (
                    MESSAGES.verifyOtp
                  )}
                </Button>
              </form>
            )}
          </div>

          {/* Register link */}
          <p className="text-center text-sm text-muted-foreground">
            {MESSAGES.noAccount}{" "}
            <Link
              href="/auth/register"
              className="text-blue-600 dark:text-blue-400 font-medium hover:underline min-h-[44px] inline-flex items-center"
            >
              {MESSAGES.signUp}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}