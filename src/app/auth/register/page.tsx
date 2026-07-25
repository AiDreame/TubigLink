"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Droplets, Store, User, ChevronRight, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import toast from "react-hot-toast";
import { MESSAGES } from "@/lib/constants";

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get("role") === "provider" ? "provider" : "customer";

  const [role, setRole] = useState(defaultRole);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Provider-specific fields
  const [stationName, setStationName] = useState("");
  const [stationAddress, setStationAddress] = useState("");
  const [stationCity, setStationCity] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const body: any = { name, phone, email, password, role: role.toUpperCase() };

      if (role === "provider") {
        body.stationName = stationName;
        body.stationAddress = stationAddress;
        body.stationCity = stationCity;
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Registration failed. Pakisubukan muli.");
        return;
      }

      if (role === "provider") {
                  toast.success("Account created! Pwede ka nang mag-log in at mag-set up ng station.");
                  router.push("/auth/login?callbackUrl=/onboarding/station");
                } else {
                  toast.success("Account created! Pwede ka nang mag-log in.");
                  router.push("/auth/login");
                }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 flex flex-col">
      <div className="p-4">
        <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline min-h-[44px] inline-flex items-center" aria-label="Go back to home">
          ← Back to Home
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-20">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="h-16 w-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4" aria-hidden="true">
              <Droplets className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">{MESSAGES.joinTitle}</h1>
            <p className="text-muted-foreground mt-1">
              {MESSAGES.joinDesc}
            </p>
          </div>

          <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
            <Tabs value={role} onValueChange={setRole} className="w-full">
              <TabsList className="w-full grid grid-cols-2 bg-muted">
                <TabsTrigger value="customer" className="flex items-center gap-2 min-h-[44px] data-[state=active]:bg-card">
                  <User className="h-4 w-4" aria-hidden="true" /> {MESSAGES.customer}
                </TabsTrigger>
                <TabsTrigger value="provider" className="flex items-center gap-2 min-h-[44px] data-[state=active]:bg-card">
                  <Store className="h-4 w-4" aria-hidden="true" /> {MESSAGES.waterStation}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="customer" className="mt-6">
                <form onSubmit={handleRegister} className="space-y-4" aria-label="Customer registration form">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-card-foreground">{MESSAGES.fullName}</Label>
                    <Input
                      id="name"
                      placeholder="Juan dela Cruz"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      aria-label="Full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-card-foreground">{MESSAGES.phoneNumber}</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="0917XXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      aria-label="Phone number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-card-foreground">{MESSAGES.emailOptional}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="juan@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      aria-label="Email address (optional)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-card-foreground">{MESSAGES.password}</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Min. 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={6}
                        required
                        className="pr-10"
                        aria-label="Password (minimum 6 characters)"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full rounded-xl min-h-[44px]"
                    size="lg"
                    disabled={isLoading}
                    aria-label={isLoading ? MESSAGES.creatingAccount : MESSAGES.createAccount}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {MESSAGES.creatingAccount}
                      </span>
                    ) : (
                      MESSAGES.createAccount
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="provider" className="mt-6">
                <div className="text-center mb-4">
                  <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mx-auto mb-3">
                    <Store className="h-6 w-6 text-blue-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Register your water station with our step-by-step wizard. Set up your products, delivery zones, and hours — all in one go.
                  </p>
                </div>

                <Link href="/onboarding/station">
                  <Button
                    className="w-full rounded-xl min-h-[52px] text-base"
                    size="lg"
                  >
                    <span className="flex items-center gap-2">
                      Start 5-Step Setup <ChevronRight className="h-5 w-5" />
                    </span>
                  </Button>
                </Link>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or quick register</span>
                  </div>
                </div>

                <form onSubmit={handleRegister} className="space-y-4" aria-label="Water station quick registration form">
                  <div className="space-y-2">
                    <Label htmlFor="ownerName" className="text-card-foreground">{MESSAGES.ownerName}</Label>
                    <Input
                      id="ownerName"
                      placeholder="Maria Santos"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      aria-label="Owner full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stationName" className="text-card-foreground">{MESSAGES.stationName}</Label>
                    <Input
                      id="stationName"
                      placeholder="Santos Water Refilling Station"
                      value={stationName}
                      onChange={(e) => setStationName(e.target.value)}
                      required
                      aria-label="Water station name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-card-foreground">{MESSAGES.phoneNumber}</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="0917XXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      aria-label="Phone number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stationAddress" className="text-card-foreground">{MESSAGES.stationAddress}</Label>
                    <Input
                      id="stationAddress"
                      placeholder="123 Rizal St., Barangay San Antonio"
                      value={stationAddress}
                      onChange={(e) => setStationAddress(e.target.value)}
                      required
                      aria-label="Station address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stationCity" className="text-card-foreground">{MESSAGES.city}</Label>
                    <Input
                      id="stationCity"
                      placeholder="Makati City"
                      value={stationCity}
                      onChange={(e) => setStationCity(e.target.value)}
                      required
                      aria-label="City"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-card-foreground">{MESSAGES.emailOptional}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="santoswater@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      aria-label="Email address (optional)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-card-foreground">{MESSAGES.password}</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Min. 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={6}
                        required
                        className="pr-10"
                        aria-label="Password (minimum 6 characters)"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full rounded-xl min-h-[44px]"
                    size="lg"
                    disabled={isLoading}
                    aria-label={isLoading ? MESSAGES.creatingAccount : MESSAGES.registerStation}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {MESSAGES.creatingAccount}
                      </span>
                    ) : (
                      MESSAGES.registerStation
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {MESSAGES.haveAccount}{" "}
            <Link href="/auth/login" className="text-blue-600 dark:text-blue-400 font-medium hover:underline min-h-[44px] inline-flex items-center">
              {MESSAGES.logIn}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}