"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Store,
  MapPin,
  Clock,
  Truck,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  Power,
  Globe,
  Phone,
  FileText,
  X,
  Droplets,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
interface DeliveryZone {
  id?: string;
  barangay: string;
  city: string;
  deliveryFee: number;
  estimatedMinutes: number;
}

interface StationData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  banner: string | null;
  phone: string | null;
  address: string;
  barangay: string;
  city: string;
  province: string;
  latitude: number | null;
  longitude: number | null;
  deliveryFee: number;
  minOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  openingTime: string;
  closingTime: string;
  deliveryZones: DeliveryZone[];
  products?: { id: string; name: string; type: string }[];
}

export default function DashboardSettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [station, setStation] = useState<StationData | null>(null);
  const [form, setForm] = useState<Partial<StationData>>({});
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [editingZoneIndex, setEditingZoneIndex] = useState<number | null>(null);
  const [zoneForm, setZoneForm] = useState<DeliveryZone>({
    barangay: "",
    city: "",
    deliveryFee: 0,
    estimatedMinutes: 30,
  });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchStation = useCallback(() => {
    setLoading(true);
    fetch("/api/dashboard/station")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setStation(json.data);
          setForm({
            name: json.data.name,
            description: json.data.description,
            logo: json.data.logo,
            banner: json.data.banner,
            phone: json.data.phone,
            address: json.data.address,
            barangay: json.data.barangay,
            city: json.data.city,
            province: json.data.province,
            latitude: json.data.latitude,
            longitude: json.data.longitude,
            deliveryFee: json.data.deliveryFee,
            minOrder: json.data.minOrder,
            openingTime: json.data.openingTime,
            closingTime: json.data.closingTime,
            isActive: json.data.isActive,
          });
          setDeliveryZones(json.data.deliveryZones || []);
        } else {
          toast.error(json.error || "Failed to load station");
        }
      })
      .catch(() => toast.error("Failed to connect"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (session?.user) fetchStation();
  }, [session, fetchStation]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.name?.trim()) newErrors.name = "Station name is required";
    if (!form.address?.trim()) newErrors.address = "Address is required";
    if (!form.barangay?.trim()) newErrors.barangay = "Barangay is required";
    if (!form.city?.trim()) newErrors.city = "City is required";
    if (!form.province?.trim()) newErrors.province = "Province is required";
    if (!form.phone?.trim()) newErrors.phone = "Phone is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error("Please fix the form errors before saving.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/station", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          deliveryZones,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Station settings saved successfully!");
        setStation(json.data);
        setDeliveryZones(json.data.deliveryZones || []);
      } else {
        toast.error(json.error || "Failed to save");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  // ─── Delivery Zone CRUD ───

  const openAddZone = () => {
    setEditingZoneIndex(null);
    setZoneForm({
      barangay: "",
      city: form.city || "Manila",
      deliveryFee: 0,
      estimatedMinutes: 30,
    });
    setZoneDialogOpen(true);
  };

  const openEditZone = (index: number) => {
    setEditingZoneIndex(index);
    setZoneForm({ ...deliveryZones[index] });
    setZoneDialogOpen(true);
  };

  const saveZone = () => {
    if (!zoneForm.barangay.trim()) {
      toast.error("Barangay is required");
      return;
    }
    if (zoneForm.deliveryFee < 0) {
      toast.error("Delivery fee cannot be negative");
      return;
    }
    if (zoneForm.estimatedMinutes < 1) {
      toast.error("Estimated minutes must be at least 1");
      return;
    }

    const newZones = [...deliveryZones];
    if (editingZoneIndex !== null) {
      newZones[editingZoneIndex] = { ...zoneForm };
    } else {
      newZones.push({ ...zoneForm });
    }
    setDeliveryZones(newZones);
    setZoneDialogOpen(false);
    toast.success(editingZoneIndex !== null ? "Zone updated" : "Zone added");
  };

  const removeZone = (index: number) => {
    const newZones = deliveryZones.filter((_, i) => i !== index);
    setDeliveryZones(newZones);
    setConfirmDelete(null);
    toast.success("Delivery zone removed");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!station) {
    return (
      <div className="text-center py-32">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">No station found for this account.</p>
        <p className="text-sm text-muted-foreground mt-2">Please contact support if you believe this is an error.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Station Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your water station&apos;s profile, delivery areas, and availability.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            className="rounded-xl min-h-[44px] dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            onClick={fetchStation}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 rounded-xl min-h-[44px]"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Active Status Banner */}
      <div className={`rounded-2xl p-4 flex items-center justify-between ${
        form.isActive
          ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
          : "bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
            form.isActive
              ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
              : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
          }`}>
            <Power className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-sm dark:text-white">
              {form.isActive ? "Station is Active" : "Station is Paused"}
            </p>
            <p className="text-xs text-muted-foreground">
              {form.isActive
                ? "Your station can receive new orders."
                : "No new orders will be accepted while paused."}
            </p>
          </div>
        </div>
        <Switch
          checked={form.isActive ?? true}
          onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
          aria-label="Toggle station active status"
        />
      </div>

      {/* Main Settings Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ─── Basic Info ─── */}
        <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <Store className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Basic Information</CardTitle>
                <CardDescription>Your station&apos;s name and contact details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Station Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-bold">
                Station Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={form.name || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className={`rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 min-h-[44px] ${
                  errors.name ? "border-red-500" : ""
                }`}
                placeholder="e.g. Aquino Water Station"
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-bold">
                Description
              </Label>
              <Textarea
                id="description"
                value={form.description || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className="rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 min-h-[80px]"
                placeholder="Tell customers about your water station..."
                rows={3}
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-bold">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <Input
                  id="phone"
                  value={form.phone || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className={`rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 pl-10 min-h-[44px] ${
                    errors.phone ? "border-red-500" : ""
                  }`}
                  placeholder="e.g. 09171234567"
                />
              </div>
              {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
            </div>

            {/* Logo URL */}
            <div className="space-y-2">
              <Label htmlFor="logo" className="text-sm font-bold">Logo URL</Label>
              <Input
                id="logo"
                value={form.logo || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, logo: e.target.value }))}
                className="rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 min-h-[44px]"
                placeholder="https://example.com/logo.png"
              />
            </div>

            {/* Banner URL */}
            <div className="space-y-2">
              <Label htmlFor="banner" className="text-sm font-bold">Banner URL</Label>
              <Input
                id="banner"
                value={form.banner || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, banner: e.target.value }))}
                className="rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 min-h-[44px]"
                placeholder="https://example.com/banner.png"
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── Address & Location ─── */}
        <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Address & Location</CardTitle>
                <CardDescription>Where is your station located?</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Province */}
            <div className="space-y-2">
              <Label htmlFor="province" className="text-sm font-bold">
                Province <span className="text-red-500">*</span>
              </Label>
              <Input
                id="province"
                value={form.province || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, province: e.target.value }))}
                className={`rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 min-h-[44px] ${
                  errors.province ? "border-red-500" : ""
                }`}
                placeholder="e.g. Bohol"
              />
              {errors.province && <p className="text-xs text-red-500">{errors.province}</p>}
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label htmlFor="city" className="text-sm font-bold">
                City <span className="text-red-500">*</span>
              </Label>
              <Input
                id="city"
                value={form.city || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                className={`rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 min-h-[44px] ${
                  errors.city ? "border-red-500" : ""
                }`}
                placeholder="e.g. Tagbilaran"
              />
              {errors.city && <p className="text-xs text-red-500">{errors.city}</p>}
            </div>

            {/* Barangay */}
            <div className="space-y-2">
              <Label htmlFor="barangay" className="text-sm font-bold">
                Barangay <span className="text-red-500">*</span>
              </Label>
              <Input
                id="barangay"
                value={form.barangay || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, barangay: e.target.value }))}
                className={`rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 min-h-[44px] ${
                  errors.barangay ? "border-red-500" : ""
                }`}
                placeholder="e.g. Poblacion"
              />
              {errors.barangay && <p className="text-xs text-red-500">{errors.barangay}</p>}
            </div>

            {/* Street Address */}
            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-bold">
                Street Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="address"
                value={form.address || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                className={`rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 min-h-[44px] ${
                  errors.address ? "border-red-500" : ""
                }`}
                placeholder="e.g. 123 Mabini St."
              />
              {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="latitude" className="text-sm font-bold">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.0001"
                  value={form.latitude ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, latitude: e.target.value ? parseFloat(e.target.value) : null }))}
                  className="rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 min-h-[44px]"
                  placeholder="14.5995"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude" className="text-sm font-bold">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.0001"
                  value={form.longitude ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, longitude: e.target.value ? parseFloat(e.target.value) : null }))}
                  className="rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 min-h-[44px]"
                  placeholder="120.9842"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Delivery Settings ─── */}
        <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                <Truck className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Delivery Settings</CardTitle>
                <CardDescription>Delivery fees and minimum order amount</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="deliveryFee" className="text-sm font-bold">Delivery Fee (₱)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm font-bold">₱</span>
                  <Input
                    id="deliveryFee"
                    type="number"
                    min="0"
                    step="5"
                    value={form.deliveryFee ?? 0}
                    onChange={(e) => setForm((prev) => ({ ...prev, deliveryFee: parseFloat(e.target.value) || 0 }))}
                    className="rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 pl-8 min-h-[44px]"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="minOrder" className="text-sm font-bold">Min. Order (₱)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm font-bold">₱</span>
                  <Input
                    id="minOrder"
                    type="number"
                    min="0"
                    step="10"
                    value={form.minOrder ?? 0}
                    onChange={(e) => setForm((prev) => ({ ...prev, minOrder: parseFloat(e.target.value) || 0 }))}
                    className="rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 pl-8 min-h-[44px]"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Set to 0 for free delivery or no minimum order requirement.
            </p>
          </CardContent>
        </Card>

        {/* ─── Operating Hours ─── */}
        <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Operating Hours</CardTitle>
                <CardDescription>When is your station open for orders?</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="openingTime" className="text-sm font-bold">Opening Time</Label>
                <Input
                  id="openingTime"
                  type="time"
                  value={form.openingTime || "06:00"}
                  onChange={(e) => setForm((prev) => ({ ...prev, openingTime: e.target.value }))}
                  className="rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 min-h-[44px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="closingTime" className="text-sm font-bold">Closing Time</Label>
                <Input
                  id="closingTime"
                  type="time"
                  value={form.closingTime || "21:00"}
                  onChange={(e) => setForm((prev) => ({ ...prev, closingTime: e.target.value }))}
                  className="rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 min-h-[44px]"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Delivery Zones ─── */}
      <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Delivery Zones</CardTitle>
                <CardDescription>
                  {deliveryZones.length} area{deliveryZones.length !== 1 ? "s" : ""} where you deliver
                </CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 rounded-xl min-h-[44px]"
              onClick={openAddZone}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Zone
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {deliveryZones.length === 0 ? (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              <Globe className="h-10 w-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-medium dark:text-gray-300">No delivery zones yet</p>
              <p className="text-xs mt-1 dark:text-gray-400">
                Add areas where your station can deliver to.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {deliveryZones.map((zone, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
                      <span className="font-bold text-sm dark:text-white truncate">{zone.barangay}</span>
                      <Badge variant="outline" className="text-[10px] dark:border-gray-600 dark:text-gray-400">
                        {zone.city}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        ₱{zone.deliveryFee.toFixed(2)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        ~{zone.estimatedMinutes} min
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity dark:text-gray-400"
                      onClick={() => openEditZone(index)}
                      aria-label={`Edit ${zone.barangay} zone`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-red-400"
                      onClick={() => setConfirmDelete(zone.barangay)}
                      aria-label={`Remove ${zone.barangay} zone`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Delete confirmation */}
                  {confirmDelete === zone.barangay && (
                    <div className="absolute inset-0 bg-white/95 dark:bg-gray-900/95 rounded-xl flex items-center justify-center gap-3 z-10">
                      <p className="text-sm font-medium dark:text-gray-300">Remove {zone.barangay}?</p>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-lg min-h-[36px]"
                        onClick={() => removeZone(index)}
                      >
                        Remove
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg min-h-[36px] dark:border-gray-700 dark:text-gray-300"
                        onClick={() => setConfirmDelete(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Zone Add/Edit Dialog ─── */}
      <Dialog open={zoneDialogOpen} onOpenChange={setZoneDialogOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingZoneIndex !== null ? "Edit Delivery Zone" : "Add Delivery Zone"}
            </DialogTitle>
            <DialogDescription>
              Set the delivery area, fee, and estimated time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* City */}
            <div className="space-y-2">
              <Label htmlFor="zone-city" className="text-sm font-bold">City</Label>
              <Input
                id="zone-city"
                value={zoneForm.city}
                onChange={(e) => setZoneForm((prev) => ({ ...prev, city: e.target.value }))}
                className="rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 min-h-[44px]"
                placeholder="e.g. Tagbilaran"
              />
            </div>

            {/* Barangay */}
            <div className="space-y-2">
              <Label htmlFor="zone-barangay" className="text-sm font-bold">Barangay</Label>
              <Input
                id="zone-barangay"
                value={zoneForm.barangay}
                onChange={(e) => setZoneForm((prev) => ({ ...prev, barangay: e.target.value }))}
                className="rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 min-h-[44px]"
                placeholder="e.g. Poblacion"
              />
            </div>

            {/* Delivery Fee */}
            <div className="space-y-2">
              <Label htmlFor="zone-fee" className="text-sm font-bold">Delivery Fee (₱)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm font-bold">₱</span>
                <Input
                  id="zone-fee"
                  type="number"
                  min="0"
                  step="5"
                  value={zoneForm.deliveryFee}
                  onChange={(e) => setZoneForm((prev) => ({ ...prev, deliveryFee: parseFloat(e.target.value) || 0 }))}
                  className="rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 pl-8 min-h-[44px]"
                />
              </div>
            </div>

            {/* Estimated Minutes */}
            <div className="space-y-2">
              <Label htmlFor="zone-minutes" className="text-sm font-bold">Estimated Delivery Time (minutes)</Label>
              <Input
                id="zone-minutes"
                type="number"
                min="5"
                max="180"
                step="5"
                value={zoneForm.estimatedMinutes}
                onChange={(e) => setZoneForm((prev) => ({ ...prev, estimatedMinutes: parseInt(e.target.value) || 30 }))}
                className="rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 min-h-[44px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl min-h-[44px] dark:border-gray-700 dark:text-gray-300"
              onClick={() => setZoneDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 rounded-xl min-h-[44px]"
              onClick={saveZone}
            >
              {editingZoneIndex !== null ? "Save Changes" : "Add Zone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Save Footer (sticky on mobile) ─── */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-950 border-t dark:border-gray-800 p-4 -mx-4 lg:-mx-8 -mb-8 lg:-mb-8 mt-8 flex justify-end gap-3 shadow-lg">
        <Button
          variant="outline"
          className="rounded-xl min-h-[44px] dark:border-gray-700 dark:text-gray-300"
          onClick={fetchStation}
          disabled={saving}
        >
          <X className="h-4 w-4 mr-2" />
          Discard Changes
        </Button>
        <Button
          className="bg-blue-600 hover:bg-blue-700 rounded-xl min-h-[44px]"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
