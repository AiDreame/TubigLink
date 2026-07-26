"use client";

import { useState, useCallback, useMemo } from "react";
import { MapPin, Home, Briefcase, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROVINCES_BY_ISLAND, CITIES_BY_PROVINCE } from "@/lib/constants";
import { BarangayInput } from "@/components/shared/BarangayInput";

export interface AddressFormValues {
  label: string;
  name: string;
  phone: string;
  street: string;
  islandGroup: string;
  province: string;
  city: string;
  barangay: string;
  isDefault: boolean;
}

interface AddressFormProps {
  initialValues?: Partial<AddressFormValues>;
  onSave: (values: AddressFormValues) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

const LABEL_OPTIONS = [
  { value: "Home", icon: Home },
  { value: "Office", icon: Briefcase },
  { value: "Other", icon: Building2 },
];

const DEFAULT_VALUES: AddressFormValues = {
  label: "Home",
  name: "",
  phone: "",
  street: "",
  islandGroup: "",
  province: "",
  city: "",
  barangay: "",
  isDefault: false,
};

export function AddressForm({ initialValues, onSave, onCancel, isSaving }: AddressFormProps) {
  const [form, setForm] = useState<AddressFormValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AddressFormValues, string>>>({});

  // Derived data for cascading dropdowns
  const islandGroups = useMemo(() => Object.keys(PROVINCES_BY_ISLAND), []);

  const provincesForIsland = useMemo(() => {
    if (!form.islandGroup) return [];
    return PROVINCES_BY_ISLAND[form.islandGroup] || [];
  }, [form.islandGroup]);

  const citiesForProvince = useMemo(() => {
    if (!form.province) return [];
    return CITIES_BY_PROVINCE[form.province] || [];
  }, [form.province]);

  const handleChange = useCallback(
    (field: keyof AddressFormValues, value: string | boolean) => {
      setForm((prev) => {
        const updates: Partial<AddressFormValues> = { [field]: value as any };
        // Reset cascading fields when a parent changes
        if (field === "islandGroup") {
          updates.province = "";
          updates.city = "";
          updates.barangay = "";
        } else if (field === "province") {
          updates.city = "";
          updates.barangay = "";
        } else if (field === "city") {
          updates.barangay = "";
        }
        return { ...prev, ...updates };
      });
      // Clear error for this field
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    []
  );

  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof AddressFormValues, string>> = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.phone.trim()) newErrors.phone = "Phone is required";
    else if (!/^(\+63|0)\d{10}$/.test(form.phone.replace(/\s/g, "")))
      newErrors.phone = "Invalid phone number (e.g., +639123456789)";
    if (!form.street.trim()) newErrors.street = "Street address is required";
    if (!form.islandGroup) newErrors.islandGroup = "Select an island group";
    if (!form.province) newErrors.province = "Select a province";
    if (!form.city) newErrors.city = "Select a city";
    if (!form.barangay) newErrors.barangay = "Select a barangay";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (validate()) {
        onSave(form);
      }
    },
    [form, validate, onSave]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Label Selector */}
      <div>
        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
          Address Label
        </Label>
        <div className="flex gap-2">
          {LABEL_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = form.label === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleChange("label", opt.value)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                  isActive
                    ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                    : "bg-white dark:bg-gray-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <Icon className="h-4 w-4" />
                {opt.value}
              </button>
            );
          })}
        </div>
      </div>

      {/* Name & Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="address-name" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Full Name
          </Label>
          <Input
            id="address-name"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Juan Dela Cruz"
            className={errors.name ? "border-red-500" : ""}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address-phone" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Phone Number
          </Label>
          <Input
            id="address-phone"
            value={form.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="+639123456789"
            className={errors.phone ? "border-red-500" : ""}
          />
          {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
        </div>
      </div>

      {/* Island Group → Province → City → Barangay cascade */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Island Group */}
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Island Group
          </Label>
          <Select
            value={form.islandGroup}
            onValueChange={(v) => handleChange("islandGroup", v)}
          >
            <SelectTrigger className={errors.islandGroup ? "border-red-500" : ""}>
              <SelectValue placeholder="Select island group" />
            </SelectTrigger>
            <SelectContent>
              {islandGroups.map((group) => (
                <SelectItem key={group} value={group}>
                  {group}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.islandGroup && <p className="text-xs text-red-500">{errors.islandGroup}</p>}
        </div>

        {/* Province */}
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Province
          </Label>
          <Select
            value={form.province}
            onValueChange={(v) => handleChange("province", v)}
            disabled={!form.islandGroup}
          >
            <SelectTrigger className={errors.province ? "border-red-500" : ""}>
              <SelectValue placeholder={form.islandGroup ? "Select province" : "Select island first"} />
            </SelectTrigger>
            <SelectContent>
              {provincesForIsland.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.province && <p className="text-xs text-red-500">{errors.province}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* City */}
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            City / Municipality
          </Label>
          <Select
            value={form.city}
            onValueChange={(v) => handleChange("city", v)}
            disabled={!form.province}
          >
            <SelectTrigger className={errors.city ? "border-red-500" : ""}>
              <SelectValue placeholder={form.province ? "Select city" : "Select province first"} />
            </SelectTrigger>
            <SelectContent>
              {citiesForProvince.map((city) => (
                <SelectItem key={city.id} value={city.id}>
                  {city.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.city && <p className="text-xs text-red-500">{errors.city}</p>}
        </div>

        {/* Barangay */}
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Barangay
          </Label>
          <BarangayInput
            value={form.barangay}
            onChange={(v) => handleChange("barangay", v)}
            onCityChange={(v) => handleChange("city", v)}
            placeholder={form.city ? "Search or type a barangay..." : "Type your barangay..."}
          />
          {errors.barangay && <p className="text-xs text-red-500">{errors.barangay}</p>}
        </div>
      </div>

      {/* Street Address */}
      <div className="space-y-1.5">
        <Label htmlFor="address-street" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Street Address
        </Label>
        <Input
          id="address-street"
          value={form.street}
          onChange={(e) => handleChange("street", e.target.value)}
          placeholder="123 Rizal Street, Barangay Example"
          className={errors.street ? "border-red-500" : ""}
        />
        {errors.street && <p className="text-xs text-red-500">{errors.street}</p>}
      </div>

      {/* Set as Default */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="address-default"
          checked={form.isDefault}
          onCheckedChange={(checked) => handleChange("isDefault", checked === true)}
        />
        <Label htmlFor="address-default" className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
          Set as default address
        </Label>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving} className="gap-2">
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSaving ? "Saving..." : "Save Address"}
        </Button>
      </div>
    </form>
  );
}
