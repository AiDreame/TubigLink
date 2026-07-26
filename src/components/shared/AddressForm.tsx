"use client";

import { useState, useCallback } from "react";
import { MapPin, Home, Briefcase, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AddressAutocomplete } from "@/components/shared/AddressAutocomplete";

export interface AddressFormValues {
  label: string;
  name: string;
  phone: string;
  street: string;
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

  const handleChange = useCallback(
    (field: keyof AddressFormValues, value: string | boolean) => {
      setForm((prev) => ({ ...prev, [field]: value as any }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    []
  );

  const handleLocationChange = useCallback(
    (result: { barangay: string; city: string; province: string }) => {
      setForm((prev) => ({
        ...prev,
        barangay: result.barangay,
        city: result.city,
        province: result.province,
      }));
      setErrors((prev) => ({
        ...prev,
        barangay: undefined,
        city: undefined,
        province: undefined,
      }));
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
    if (!form.province) newErrors.province = "Select a location";
    if (!form.city) newErrors.city = "Select a location";
    if (!form.barangay) newErrors.barangay = "Select a location";
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

      {/* Location autocomplete replaces island/province/city/barangay cascade */}
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Location
        </Label>
        <AddressAutocomplete
          placeholder="Search barangay, city, or province..."
          defaultBarangay={form.barangay}
          defaultCity={form.city}
          defaultProvince={form.province}
          onChange={handleLocationChange}
          error={errors.barangay || errors.city || errors.province}
        />
        <p className="text-xs text-muted-foreground">
          Start typing to find your barangay, city, or province
        </p>
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
