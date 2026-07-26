"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Plus, MapPin, Trash2, Home as HomeIcon, Briefcase, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { MESSAGES } from "@/lib/constants";
import { AddressForm, AddressFormValues } from "@/components/shared/AddressForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Address {
  id: string;
  label: string;
  name: string;
  phone: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  isDefault: boolean;
}

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
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
    setDialogMode("add");
    setEditingId(null);
    setEditingAddress(null);
    setDialogOpen(true);
  };

  // ─── OPEN EDIT DIALOG ─────────────────────────────────
  const openEditDialog = (address: Address) => {
    setDialogMode("edit");
    setEditingId(address.id);
    setEditingAddress(address);
    setDialogOpen(true);
  };

  // ─── SAVE (ADD or EDIT) ───────────────────────────────
  const handleSave = async (values: AddressFormValues) => {
    setIsSaving(true);
    setError(null);
    try {
      if (dialogMode === "add") {
        const res = await fetch("/api/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: values.label,
            name: values.name,
            phone: values.phone,
            street: values.street,
            barangay: values.barangay,
            city: values.city,
            province: values.province,
            isDefault: values.isDefault,
            userId,
          }),
        });
        const data = await res.json();
        if (data.success) {
          await fetchAddresses();
          showSuccess("Address added successfully");
          setDialogOpen(false);
        } else {
          setError(data.error || "Failed to add address");
        }
      } else {
        const res = await fetch(`/api/addresses?id=${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: values.label,
            name: values.name,
            phone: values.phone,
            street: values.street,
            barangay: values.barangay,
            city: values.city,
            province: values.province,
            isDefault: values.isDefault,
            userId,
          }),
        });
        const data = await res.json();
        if (data.success) {
          await fetchAddresses();
          showSuccess("Address updated successfully");
          setDialogOpen(false);
        } else {
          setError(data.error || "Failed to update address");
        }
      }
    } catch {
      setError("Something went wrong saving the address");
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

  const getInitialValues = (): Partial<AddressFormValues> | undefined => {
    if (!editingAddress) return undefined;
    return {
      label: editingAddress.label,
      name: editingAddress.name,
      phone: editingAddress.phone,
      street: editingAddress.street,
      barangay: editingAddress.barangay,
      city: editingAddress.city,
      province: editingAddress.province,
      isDefault: editingAddress.isDefault,
    };
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
                <div key={address.id} className="bg-card rounded-3xl p-6 shadow-sm border border-border space-y-4">
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
            <DialogTitle className="text-card-foreground">
              {dialogMode === "add" ? "Add New Address" : "Edit Address"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "add"
                ? "Enter your delivery address details with the island-to-barangay hierarchy."
                : "Update your delivery address details."}
            </DialogDescription>
          </DialogHeader>

          <AddressForm
            initialValues={getInitialValues()}
            onSave={handleSave}
            onCancel={() => setDialogOpen(false)}
            isSaving={isSaving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}