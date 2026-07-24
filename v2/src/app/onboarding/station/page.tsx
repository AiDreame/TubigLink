"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Droplets,
  Store,
  Package,
  MapPin,
  Clock,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  Lock,
  User,
  MapPinned,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import toast from "react-hot-toast";
import { MESSAGES, WATER_TYPES, PRODUCT_SIZES, ALL_SUPPORTED_CITIES, SAMPLE_BARANGAYS } from "@/lib/constants";

const STEPS = [
  { id: 1, label: "Account", icon: User },
  { id: 2, label: "Station", icon: Store },
  { id: 3, label: "Products", icon: Package },
  { id: 4, label: "Zones", icon: MapPin },
  { id: 5, label: "Review", icon: Clock },
];

interface Product {
  type: string;
  size: string;
  price: string;
  stock: string;
  description: string;
}

interface Zone {
  barangay: string;
  city: string;
  deliveryFee: string;
  estimatedMinutes: string;
}

export default function StationOnboardingPage() {
  const { data: session, status: sessionStatus } = useSession();
  const isLoggedIn = sessionStatus === "authenticated";
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // If logged in, fetch existing onboarding progress and skip to correct step
  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!isLoggedIn) {
      setInitialLoading(false);
      return;
    }
    fetch("/api/onboarding/station")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const station = json.data;
          if (station.onboardingComplete) {
            router.push("/dashboard");
            return;
          }
          // Pre-fill fields from existing data
          if (station.name) setStationName(station.name);
          if (station.description) setStationDesc(station.description);
          if (station.address) setStationAddress(station.address);
          if (station.barangay) setStationBarangay(station.barangay);
          if (station.city) setStationCity(station.city);
          if (station.province) setStationProvince(station.province);
          if (station.phone) setStationPhone(station.phone);
          if (station.openingTime) setOpeningTime(station.openingTime);
          if (station.closingTime) setClosingTime(station.closingTime);
          if (station.deliveryFee !== null) setDeliveryFee(String(station.deliveryFee));
          if (station.minOrder !== null) setMinOrder(String(station.minOrder));
          if (station.businessType) setBusinessType(station.businessType);
          if (station.tin) setTin(station.tin);
          // Pre-fill products
          if (station.products?.length > 0) {
            setProducts(
              station.products.map((p: any) => ({
                type: p.type,
                size: p.size,
                price: String(p.price),
                stock: String(p.stock),
                description: p.description || "",
              }))
            );
          }
          // Pre-fill zones
          if (station.deliveryZones?.length > 0) {
            setZones(
              station.deliveryZones.map((z: any) => ({
                barangay: z.barangay,
                city: z.city,
                deliveryFee: String(z.deliveryFee),
                estimatedMinutes: String(z.estimatedMinutes),
              }))
            );
          }
          // Set step to the next incomplete step
          setStep(Math.min(station.onboardingStep + 1, 5));
        }
        setInitialLoading(false);
      })
      .catch(() => setInitialLoading(false));
  }, [sessionStatus, isLoggedIn, router]);

  // Step 1: Account
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  // Step 2: Station
  const [stationName, setStationName] = useState("");
  const [stationDesc, setStationDesc] = useState("");
  const [stationAddress, setStationAddress] = useState("");
  const [stationBarangay, setStationBarangay] = useState("");
  const [stationCity, setStationCity] = useState("");
  const [stationProvince, setStationProvince] = useState("Metro Manila");
  const [stationPhone, setStationPhone] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [tin, setTin] = useState("");

  // Step 3: Products
  const [products, setProducts] = useState<Product[]>([
    { type: "PURIFIED", size: "5-gallon", price: "60", stock: "50", description: "" },
  ]);

  // Step 4: Delivery Zones
  const [zones, setZones] = useState<Zone[]>([
    { barangay: "", city: "", deliveryFee: "0", estimatedMinutes: "30" },
  ]);

  // Step 5: Hours
  const [openingTime, setOpeningTime] = useState("06:00");
  const [closingTime, setClosingTime] = useState("21:00");
  const [deliveryFee, setDeliveryFee] = useState("20");
  const [minOrder, setMinOrder] = useState("0");

  const handleStep1 = async () => {
    if (!name || !phone || !password) {
      toast.error("Name, phone, and password are required.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/onboarding/station", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: 1,
          data: { name, phone, email, password, stationName: stationName || "My Water Station" },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Registration failed.");
        return;
      }
      setUserId(json.data.userId);
      toast.success("Account created! Log in to continue.");
      // Redirect to login briefly, then back to onboarding
      router.push("/auth/login?callbackUrl=/onboarding/station");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep2 = async () => {
    if (!stationName || !stationAddress || !stationBarangay || !stationCity) {
      toast.error("Station name, address, barangay, and city are required.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/onboarding/station", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: 2,
          data: {
            name: stationName,
            description: stationDesc,
            address: stationAddress,
            barangay: stationBarangay,
            city: stationCity,
            province: stationProvince,
            phone: stationPhone,
            businessType,
            tin,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to save station info.");
        return;
      }
      toast.success("Station info saved!");
      setStep(3);
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep3 = async () => {
    const validProducts = products.filter((p) => p.price && p.stock);
    if (validProducts.length === 0) {
      toast.error("Add at least one product with a price and stock.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/onboarding/station", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: 3, data: { products: validProducts } }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to save products.");
        return;
      }
      toast.success("Products saved!");
      setStep(4);
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep4 = async () => {
    const validZones = zones.filter((z) => z.barangay);
    if (validZones.length === 0) {
      toast.error("Add at least one delivery zone.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/onboarding/station", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: 4,
          data: {
            zones: validZones.map((z) => ({
              ...z,
              city: z.city || stationCity,
            })),
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to save delivery zones.");
        return;
      }
      toast.success("Delivery zones saved!");
      setStep(5);
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep5 = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/onboarding/station", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: 5,
          data: { openingTime, closingTime, deliveryFee, minOrder },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to complete onboarding.");
        return;
      }
      toast.success("🎉 Onboarding complete! Your station is now live.");
      router.push("/dashboard");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addProduct = () => {
    setProducts([...products, { type: "PURIFIED", size: "5-gallon", price: "", stock: "", description: "" }]);
  };

  const removeProduct = (index: number) => {
    if (products.length <= 1) return;
    setProducts(products.filter((_, i) => i !== index));
  };

  const updateProduct = (index: number, field: keyof Product, value: string) => {
    const updated = [...products];
    updated[index] = { ...updated[index], [field]: value };
    setProducts(updated);
  };

  const addZone = () => {
    setZones([...zones, { barangay: "", city: stationCity, deliveryFee: "0", estimatedMinutes: "30" }]);
  };

  const removeZone = (index: number) => {
    if (zones.length <= 1) return;
    setZones(zones.filter((_, i) => i !== index));
  };

  const updateZone = (index: number, field: keyof Zone, value: string) => {
    const updated = [...zones];
    updated[index] = { ...updated[index], [field]: value };
    setZones(updated);
  };

  const getBarangays = () => {
    if (stationCity && SAMPLE_BARANGAYS[stationCity]) {
      return SAMPLE_BARANGAYS[stationCity];
    }
    return [];
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between px-2 mb-8">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex flex-col items-center gap-1.5">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${
              step === s.id
                ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110"
                : step > s.id
                ? "bg-green-500 text-white"
                : "bg-muted text-muted-foreground"
            }`}
            aria-label={`Step ${s.id}: ${s.label}`}
          >
            {step > s.id ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
          </div>
          <span className={`text-xs font-medium hidden sm:block ${step === s.id ? "text-blue-600" : "text-muted-foreground"}`}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-3">
          <User className="h-7 w-7 text-white" />
        </div>
        <h2 className="text-xl font-bold">Create Your Account</h2>
        <p className="text-sm text-muted-foreground">Step 1 of 5 — Personal details for your station account</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Your Full Name</Label>
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
        <Label htmlFor="email">Email (optional)</Label>
        <Input
          id="email"
          type="email"
          placeholder="juan@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-h-[48px]"
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
        <Label htmlFor="stationName">Station Name (optional for now)</Label>
        <Input
          id="stationName"
          placeholder="Santos Water Refilling Station"
          value={stationName}
          onChange={(e) => setStationName(e.target.value)}
          className="min-h-[48px]"
        />
      </div>

      <Button
        onClick={handleStep1}
        disabled={isLoading}
        className="w-full rounded-xl min-h-[52px] text-base"
        size="lg"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Creating account...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            Create Account & Continue <ChevronRight className="h-5 w-5" />
          </span>
        )}
      </Button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-3">
          <Store className="h-7 w-7 text-white" />
        </div>
        <h2 className="text-xl font-bold">Station Information</h2>
        <p className="text-sm text-muted-foreground">Step 2 of 5 — Tell us about your water station</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="stationName2">Station Name *</Label>
        <Input
          id="stationName2"
          placeholder="Santos Water Refilling Station"
          value={stationName}
          onChange={(e) => setStationName(e.target.value)}
          required
          className="min-h-[48px]"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="stationDesc">Description</Label>
        <Textarea
          id="stationDesc"
          placeholder="Tell customers about your station — your water source, filtration process, etc."
          value={stationDesc}
          onChange={(e) => setStationDesc(e.target.value)}
          rows={3}
          className="min-h-[80px]"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="stationPhone">Station Phone</Label>
        <Input
          id="stationPhone"
          type="tel"
          placeholder="0917XXXXXXX"
          value={stationPhone}
          onChange={(e) => setStationPhone(e.target.value)}
          className="min-h-[48px]"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="stationAddress">Station Address *</Label>
        <Input
          id="stationAddress"
          placeholder="123 Rizal St."
          value={stationAddress}
          onChange={(e) => setStationAddress(e.target.value)}
          required
          className="min-h-[48px]"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="stationCity">City *</Label>
          <Select value={stationCity} onValueChange={setStationCity}>
            <SelectTrigger id="stationCity" className="min-h-[48px]">
              <SelectValue placeholder="Select city" />
            </SelectTrigger>
            <SelectContent>
              {ALL_SUPPORTED_CITIES.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="stationBarangay">Barangay *</Label>
          <Select value={stationBarangay} onValueChange={setStationBarangay} disabled={!stationCity}>
            <SelectTrigger id="stationBarangay" className="min-h-[48px]">
              <SelectValue placeholder={stationCity ? "Select barangay" : "Pick city first"} />
            </SelectTrigger>
            <SelectContent>
              {getBarangays().map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="stationProvince">Province</Label>
        <Input
          id="stationProvince"
          value={stationProvince}
          onChange={(e) => setStationProvince(e.target.value)}
          className="min-h-[48px]"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="businessType">Business Type</Label>
          <Select value={businessType} onValueChange={setBusinessType}>
            <SelectTrigger id="businessType" className="min-h-[48px]">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SOLE_PROP">Sole Proprietorship</SelectItem>
              <SelectItem value="CORPORATION">Corporation</SelectItem>
              <SelectItem value="PARTNERSHIP">Partnership</SelectItem>
              <SelectItem value="COOPERATIVE">Cooperative</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tin">TIN (optional)</Label>
          <Input
            id="tin"
            placeholder="XXX-XXX-XXX-XXX"
            value={tin}
            onChange={(e) => setTin(e.target.value)}
            className="min-h-[48px]"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep(1)} className="min-h-[52px] flex-1 rounded-xl">
          <ChevronLeft className="h-5 w-5 mr-1" /> Back
        </Button>
        <Button onClick={handleStep2} disabled={isLoading} className="min-h-[52px] flex-1 rounded-xl">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <span className="flex items-center gap-1">Save & Continue <ChevronRight className="h-5 w-5" /></span>
          )}
        </Button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-3">
          <Package className="h-7 w-7 text-white" />
        </div>
        <h2 className="text-xl font-bold">Products & Pricing</h2>
        <p className="text-sm text-muted-foreground">Step 3 of 5 — Add the water products you offer</p>
      </div>

      <div className="space-y-4">
        {products.map((product, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Product #{i + 1}</span>
              {products.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeProduct(i)}
                  className="text-red-500 hover:text-red-700 min-h-[44px] min-w-[44px]"
                  aria-label="Remove product"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={product.type} onValueChange={(v) => updateProduct(i, "type", v)}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WATER_TYPES.map((wt) => (
                      <SelectItem key={wt.id} value={wt.id}>{wt.icon} {wt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Size</Label>
                <Select value={product.size} onValueChange={(v) => updateProduct(i, "size", v)}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_SIZES.map((ps) => (
                      <SelectItem key={ps.id} value={ps.id}>{ps.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Price (₱)</Label>
                <Input
                  type="number"
                  placeholder="60"
                  value={product.price}
                  onChange={(e) => updateProduct(i, "price", e.target.value)}
                  min="0"
                  step="0.5"
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Stock (units)</Label>
                <Input
                  type="number"
                  placeholder="50"
                  value={product.stock}
                  onChange={(e) => updateProduct(i, "stock", e.target.value)}
                  min="0"
                  className="min-h-[44px]"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        onClick={addProduct}
        className="w-full rounded-xl border-dashed min-h-[48px]"
      >
        <Plus className="h-5 w-5 mr-2" /> Add Another Product
      </Button>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep(2)} className="min-h-[52px] flex-1 rounded-xl">
          <ChevronLeft className="h-5 w-5 mr-1" /> Back
        </Button>
        <Button onClick={handleStep3} disabled={isLoading} className="min-h-[52px] flex-1 rounded-xl">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <span className="flex items-center gap-1">Save & Continue <ChevronRight className="h-5 w-5" /></span>
          )}
        </Button>
      </div>
    </div>
  );

  const renderStep4 = () => {
    const barangays = getBarangays();
    return (
      <div className="space-y-5">
        <div className="text-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-3">
            <MapPin className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-xl font-bold">Delivery Zones</h2>
          <p className="text-sm text-muted-foreground">Step 4 of 5 — Where do you deliver?</p>
        </div>

        <div className="space-y-4">
          {zones.map((zone, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Zone #{i + 1}</span>
                {zones.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeZone(i)}
                    className="text-red-500 hover:text-red-700 min-h-[44px] min-w-[44px]"
                    aria-label="Remove zone"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Barangay</Label>
                <Select
                  value={zone.barangay}
                  onValueChange={(v) => updateZone(i, "barangay", v)}
                  disabled={!stationCity}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder={stationCity ? "Select barangay" : "Set city in Step 2 first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {barangays.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Delivery Fee (₱)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={zone.deliveryFee}
                    onChange={(e) => updateZone(i, "deliveryFee", e.target.value)}
                    min="0"
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Est. Minutes</Label>
                  <Input
                    type="number"
                    placeholder="30"
                    value={zone.estimatedMinutes}
                    onChange={(e) => updateZone(i, "estimatedMinutes", e.target.value)}
                    min="1"
                    className="min-h-[44px]"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          onClick={addZone}
          className="w-full rounded-xl border-dashed min-h-[48px]"
          disabled={!stationCity}
        >
          <Plus className="h-5 w-5 mr-2" /> Add Another Zone
        </Button>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep(3)} className="min-h-[52px] flex-1 rounded-xl">
            <ChevronLeft className="h-5 w-5 mr-1" /> Back
          </Button>
          <Button onClick={handleStep4} disabled={isLoading} className="min-h-[52px] flex-1 rounded-xl">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <span className="flex items-center gap-1">Save & Continue <ChevronRight className="h-5 w-5" /></span>
            )}
          </Button>
        </div>
      </div>
    );
  };

  const renderStep5 = () => (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-3">
          <Clock className="h-7 w-7 text-white" />
        </div>
        <h2 className="text-xl font-bold">Review & Launch</h2>
        <p className="text-sm text-muted-foreground">Step 5 of 5 — Final details before going live</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="font-semibold text-lg">Operating Hours</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Opening Time</Label>
            <Input
              type="time"
              value={openingTime}
              onChange={(e) => setOpeningTime(e.target.value)}
              className="min-h-[48px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Closing Time</Label>
            <Input
              type="time"
              value={closingTime}
              onChange={(e) => setClosingTime(e.target.value)}
              className="min-h-[48px]"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="font-semibold text-lg">Delivery Settings</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Default Delivery Fee (₱)</Label>
            <Input
              type="number"
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
              min="0"
              className="min-h-[48px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Minimum Order (₱)</Label>
            <Input
              type="number"
              value={minOrder}
              onChange={(e) => setMinOrder(e.target.value)}
              min="0"
              className="min-h-[48px]"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-blue-50 dark:bg-blue-950/30 p-5 space-y-3">
        <h3 className="font-semibold">Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Station:</span><span className="font-medium">{stationName || "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Location:</span><span className="font-medium">{stationBarangay}, {stationCity}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Products:</span><span className="font-medium">{products.filter(p => p.price).length} items</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Delivery Zones:</span><span className="font-medium">{zones.filter(z => z.barangay).length} areas</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Hours:</span><span className="font-medium">{openingTime} — {closingTime}</span></div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep(4)} className="min-h-[52px] flex-1 rounded-xl">
          <ChevronLeft className="h-5 w-5 mr-1" /> Back
        </Button>
        <Button
          onClick={handleStep5}
          disabled={isSubmitting}
          className="min-h-[52px] flex-1 rounded-xl bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Launching...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Check className="h-5 w-5" /> Launch Station
            </span>
          )}
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        By clicking launch, you agree to our terms and conditions. Your station will be live immediately.
      </p>
    </div>
  );

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto">
            <Droplets className="h-7 w-7 text-white animate-wave" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-32 bg-muted rounded skeleton mx-auto" />
            <div className="h-3 w-48 bg-muted rounded skeleton mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm border-b">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2" aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-600" />
            <span className="font-bold text-sm">AquaLink PH — Station Onboarding</span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        {/* Step Indicator */}
        {step <= 5 && renderStepIndicator()}

        {/* Step Content */}
        <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderStep5()}
        </div>
      </div>
    </div>
  );
}