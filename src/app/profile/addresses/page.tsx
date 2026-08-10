"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Plus, MapPin, Trash2, Home as HomeIcon, Briefcase, Loader2, Check, X } from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { MESSAGES, SAMPLE_BARANGAYS } from "@/lib/constants";
import { getCityByName, normalizeCityName, type CityLocation } from "@/lib/ph-locations";
import { ProvinceCombobox } from "@/components/shared/ProvinceCombobox";
import { CityCombobox } from "@/components/shared/CityCombobox";
import { BarangayInput } from "@/components/shared/BarangayInput";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Leaflet must never render server-side — same pattern as station settings (ssr: false)
const LocationPicker = dynamic(() => import("@/components/shared/LocationPicker"), {
  ssr: false,
});

interface Address {
  id: string;
  label: string;
  name: string;
  phone: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
}

interface AddressForm {
  label: string;
  name: string;
  phone: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  latitude: number | null;
  longitude: number | null;
}

const emptyForm: AddressForm = {
  label: "Home",
  name: "",
  phone: "",
  street: "",
  barangay: "",
  city: "",
  province: "",
  latitude: null,
  longitude: null,
};

export default function AddressesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Reverse-geocode prefill state ("Filling address from map…" while waiting)
  const [geocoding, setGeocoding] = useState(false);

  // Latest form value — debounced geocode callbacks read this so they never
  // match a barangay against a stale city selection.
  const formRef = useRef(form);
  formRef.current = form;

  // Pending reverse-geocode work (cleared on unmount or on the next pin move)
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
      geocodeAbortRef.current?.abort();
    };
  }, []);

  // Best-effort Nominatim reverse geocode (free, no key). Only prefills when
  // the returned place maps cleanly onto the dialog's Province/City/Barangay
  // fields; anything else (errors, timeouts, HTTP 429) leaves the fields
  // untouched and never blocks the user. Unlike the old NCR-only version,
  // the returned city resolves against the FULL PSGC dataset, so a pin in
  // Bohol (or anywhere else) prefills province + city too.
  const reverseGeocode = async (lat: number, lng: number) => {
    const controller = new AbortController();
    geocodeAbortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 4500);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=en`,
        { signal: controller.signal, headers: { Accept: "application/json" } }
      );
      if (res.status === 429 || !res.ok) return;
      const data = await res.json();
      const a = data?.address;
      if (!a) return;

      const cityCandidates = [a.city, a.town, a.municipality, a.state];
      const cityMatches = cityCandidates
        .map((v) => (typeof v === "string" ? getCityByName(v) : undefined))
        .filter((c): c is CityLocation => Boolean(c));
      if (cityMatches.length === 0) return; // no clean match → keep the fields as-is
      // Ambiguous municipality names (e.g. "Buenavista" exists in Bohol,
      // Quezon, Marinduque, Guimaras) resolve against the state/province the
      // geocoder returned, so a Bohol pin prefills Bohol/Buenavista.
      const stateKey =
        typeof a.state === "string" ? normalizeCityName(a.state) : "";
      const cityMatch =
        (stateKey &&
          cityMatches.find(
            (c) =>
              normalizeCityName(c.province) === stateKey ||
              normalizeCityName(c.region) === stateKey
          )) ||
        cityMatches[0];

      const suburbCandidates = [
        a.suburb,
        a.quarter,
        a.village,
        a.neighbourhood,
        a.neighborhood,
      ];
      const brgyKey = Object.keys(SAMPLE_BARANGAYS).find(
        (k) => normalizeCityName(k) === normalizeCityName(cityMatch.name)
      );
      const barangays = brgyKey ? SAMPLE_BARANGAYS[brgyKey] : [];
      const barangayMatch = barangays.find((b) =>
        suburbCandidates.some(
          (v) => typeof v === "string" && normalizeCityName(v) === normalizeCityName(b)
        )
      );

      setForm((f) => {
        if (normalizeCityName(f.city) !== normalizeCityName(cityMatch.name)) {
          // City moved by the geocode → mirror the comboboxes' reset behavior
          return {
            ...f,
            city: cityMatch.name,
            province: cityMatch.province,
            barangay: barangayMatch ?? "",
          };
        }
        return barangayMatch ? { ...f, barangay: barangayMatch } : f;
      });
    } catch {
      // aborted (timeout / superseded by a new pin move), offline, or network
      // error → silently leave the fields untouched
    } finally {
      clearTimeout(timeout);
      if (geocodeAbortRef.current === controller) setGeocoding(false);
    }
  };

  // Pin dropped/moved (or "Center on my location") → store coords, then
  // best-effort prefill the dropdowns (debounced ~800ms per pin move).
  const onLocationChange = (lat: number, lng: number) => {
    setForm((f) => ({ ...f, latitude: lat, longitude: lng }));
    setGeocoding(true);
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    geocodeAbortRef.current?.abort();
    geocodeAbortRef.current = null;
    geocodeTimerRef.current = setTimeout(() => reverseGeocode(lat, lng), 800);
  };

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const userId = (session?.user as any)?.id;

  const fetchAddresses = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/addresses?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setAddresses(data.data || []);
      } else {
        setError("Failed to load addresses");
      }
    } catch {
      setError("Something went wrong loading your addresses");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchAddresses();
  }, [userId, fetchAddresses]);

  // Show success message for 3 seconds
  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // ─── DELETE ────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/addresses?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setAddresses((prev) => prev.filter((a) => a.id !== id));
        showSuccess("Address deleted successfully");
      } else {
        setError("Failed to delete address");
      }
    } catch {
      setError("Something went wrong deleting the address");
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  // ─── SET AS DEFAULT ───────────────────────────────────
  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/addresses?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true, userId }),
      });
      const data = await res.json();
      if (data.success) {
        setAddresses((prev) =>
          prev.map((a) => ({
            ...a,
            isDefault: a.id === id,
          }))
        );
        showSuccess("Default address updated");
      } else {
        setError("Failed to set as default");
      }
    } catch {
      setError("Something went wrong");
    }
  };

  // ─── OPEN ADD DIALOG ──────────────────────────────────
  const openAddDialog = () => {
    setForm(emptyForm);
    setDialogMode("add");
    setEditingId(null);
    setFormError(null);
    setDialogOpen(true);
  };

  // ─── OPEN EDIT DIALOG ─────────────────────────────────
  const openEditDialog = (address: Address) => {
    setForm({
      label: address.label,
      name: address.name,
      phone: address.phone,
      street: address.street,
      barangay: address.barangay,
      city: address.city,
      province: address.province,
      latitude: address.latitude,
      longitude: address.longitude,
    });
    setDialogMode("edit");
    setEditingId(address.id);
    setFormError(null);
    setDialogOpen(true);
  };

  // ─── SAVE (ADD or EDIT) ───────────────────────────────
  const handleSave = async () => {
    // Basic validation
    if (!form.name.trim()) {
      setFormError("Name is required");
      return;
    }
    if (!form.street.trim()) {
      setFormError("Street address is required");
      return;
    }
    if (!form.barangay.trim()) {
      setFormError("Barangay is required");
      return;
    }
    if (!form.city) {
      setFormError("City is required");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      if (dialogMode === "add") {
        const res = await fetch("/api/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, userId }),
        });
        const data = await res.json();
        if (data.success) {
          await fetchAddresses();
          showSuccess("Address added successfully");
          setDialogOpen(false);
        } else {
          setFormError(data.error || "Failed to add address");
        }
      } else {
        // Edit
        const res = await fetch(`/api/addresses?id=${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, userId }),
        });
        const data = await res.json();
        if (data.success) {
          await fetchAddresses();
          showSuccess("Address updated successfully");
          setDialogOpen(false);
        } else {
          setFormError(data.error || "Failed to update address");
        }
      }
    } catch {
      setFormError("Something went wrong saving the address");
    } finally {
      setIsSaving(false);
    }
  };

  const getIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case "home": return HomeIcon;
      case "office": return Briefcase;
      default: return MapPin;
    }
  };

  // Province changed → if the current city belongs to a different province,
  // clear city + barangay so the city combobox (filtered by province) and
  // barangay suggestions stay consistent.
  const handleProvinceChange = (province: string | null) => {
    setForm((f) => {
      const nextProvince = province ?? "";
      const cityLoc = f.city ? getCityByName(f.city) : undefined;
      if (cityLoc && cityLoc.province !== nextProvince) {
        return { ...f, province: nextProvince, city: "", barangay: "" };
      }
      return { ...f, province: nextProvince };
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card sticky top-0 z-30 border-b border-border px-4 py-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" className="rounded-full min-h-[44px] min-w-[44px]" onClick={() => router.back()} aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-card-foreground flex-1">{MESSAGES.myAddresses}</h1>
        <Link href="/" aria-label="Home">
          <Button variant="ghost" size="icon" className="rounded-full min-h-[44px] min-w-[44px]">
            <HomeIcon className="h-5 w-5" />
          </Button>
        </Link>
      </header>

      {/* Success toast */}
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
            <Check className="h-4 w-4" />
            {successMsg}
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="max-w-xl mx-auto px-4 pt-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2" aria-label="Dismiss error">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <main className="max-w-xl mx-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
            <p className="text-muted-foreground text-sm">Loading addresses...</p>
          </div>
        ) : addresses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <MapPin className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h2 className="text-xl font-bold text-foreground">No addresses yet</h2>
            <p className="text-muted-foreground mt-1 max-w-xs">
              Add a delivery address to start ordering water.
            </p>
            <Button onClick={openAddDialog} className="mt-6 rounded-xl" aria-label="Add your first address">
              <Plus className="h-4 w-4 mr-2" />
              Add Address
            </Button>
          </div>
        ) : (
          <>
            {addresses.map((address) => {
              const Icon = getIcon(address.label);
              return (
                <div key={address.id} className="bg-card rounded-2xl p-6 shadow-sm border border-border space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-card-foreground">{address.label}</h3>
                          {address.isDefault && (
                            <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 border-none text-[10px] px-2 py-0">Default</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{address.name} &bull; {address.phone}</p>
                      </div>
                    </div>
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-red-500 dark:hover:text-red-400 min-h-[44px] min-w-[44px]"
                        aria-label={`Delete ${address.label} address`}
                        onClick={() => setDeleteConfirmId(deleteConfirmId === address.id ? null : address.id)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      {/* Delete confirmation */}
                      {deleteConfirmId === address.id && (
                        <div className="absolute right-0 top-12 z-40 bg-card border border-border rounded-2xl shadow-xl p-4 w-64">
                          <p className="text-sm text-card-foreground mb-3 font-medium">Delete this address?</p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 rounded-xl text-xs"
                              onClick={() => setDeleteConfirmId(null)}
                              disabled={isDeleting}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1 rounded-xl text-xs"
                              onClick={() => handleDelete(address.id)}
                              disabled={isDeleting}
                            >
                              {isDeleting ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : null}
                              Delete
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 text-sm text-muted-foreground pl-1">
                    <MapPin className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-0.5" aria-hidden="true" />
                    <p>{address.street}, {address.barangay}, {address.city}</p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-xl text-xs min-h-[44px]"
                      aria-label={`Edit ${address.label} address`}
                      onClick={() => openEditDialog(address)}
                    >
                      Edit
                    </Button>
                    {!address.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 rounded-xl text-xs text-blue-600 dark:text-blue-400 min-h-[44px]"
                        aria-label={`Set ${address.label} as default`}
                        onClick={() => handleSetDefault(address.id)}
                      >
                        Set as Default
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {!isLoading && addresses.length > 0 && (
          <Button
            className="w-full h-14 rounded-2xl border-2 border-dashed border-border bg-transparent text-muted-foreground hover:bg-muted hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all font-bold min-h-[56px]"
            aria-label="Add new address"
            onClick={openAddDialog}
          >
            <Plus className="h-5 w-5 mr-2" aria-hidden="true" />
            Add New Address
          </Button>
        )}
      </main>

      {/* Add/Edit Address Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">{dialogMode === "add" ? "Add New Address" : "Edit Address"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "add"
                ? "Enter your delivery address details below."
                : "Update your delivery address details."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Label */}
            <div className="space-y-1.5">
              <Label htmlFor="label" className="text-card-foreground">Label</Label>
              <Select
                value={form.label}
                onValueChange={(value) => setForm((f) => ({ ...f, label: value }))}
              >
                <SelectTrigger id="label" className="w-full">
                  <SelectValue placeholder="Select label" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Home">Home</SelectItem>
                  <SelectItem value="Office">Office</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-card-foreground">Full Name</Label>
              <Input
                id="name"
                placeholder="e.g. Juan Dela Cruz"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-card-foreground">Phone Number</Label>
              <Input
                id="phone"
                placeholder="e.g. 09171234567"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>

            {/* Province */}
            <div className="space-y-1.5">
              <Label htmlFor="province" className="text-card-foreground">Province</Label>
              <ProvinceCombobox
                value={form.province}
                onChange={handleProvinceChange}
                placeholder="Type or select province…"
                triggerClassName="min-h-[44px]"
              />
            </div>

            {/* City — searchable over the full PH dataset, filtered to the
                selected province when one is chosen */}
            <div className="space-y-1.5">
              <Label htmlFor="city" className="text-card-foreground">City</Label>
              <CityCombobox
                value={form.city}
                province={form.province || undefined}
                onChange={(city) =>
                  setForm((f) =>
                    city
                      ? { ...f, city: city.name, province: city.province, barangay: "" }
                      : { ...f, city: "", province: f.province }
                  )
                }
                placeholder="Search city or municipality…"
                triggerClassName="min-h-[44px]"
              />
            </div>

            {/* Barangay — always typeable, with suggestions when known */}
            <div className="space-y-1.5">
              <Label htmlFor="barangay" className="text-card-foreground">Barangay</Label>
              <BarangayInput
                id="barangay"
                value={form.barangay}
                onChange={(v) => setForm((f) => ({ ...f, barangay: v }))}
                city={form.city || undefined}
                placeholder="Enter your barangay"
              />
            </div>

            {/* Street */}
            <div className="space-y-1.5">
              <Label htmlFor="street" className="text-card-foreground">Street Address</Label>
              <Input
                id="street"
                placeholder="e.g. 123 Rizal St., Brgy. San Antonio"
                value={form.street}
                onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
              />
            </div>

            {/* Pin-drop map — replaces the standalone "Use my location" link;
                the picker's own "Center on my location" control does that now */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold">Delivery Location</p>
                {geocoding && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1" role="status">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    Filling address from map…
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Drop the pin to set your delivery location — city and barangay
                fill in automatically when we can match them.
              </p>
              <LocationPicker
                latitude={form.latitude ?? null}
                longitude={form.longitude ?? null}
                onChange={onLocationChange}
                heightClass="h-48"
                hint="Click the map to set your delivery location, or drag the pin to fine-tune."
              />
            </div>

            {/* Form error */}
            {formError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg text-sm">
                {formError}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isSaving}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-xl min-w-[100px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                dialogMode === "add" ? "Add Address" : "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}