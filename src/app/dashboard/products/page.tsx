"use client";

import { useEffect, useState } from "react";
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  Droplet,
  Package,
  AlertCircle,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

interface Product {
  id: string;
  name: string;
  type: string;
  size: string;
  price: number;
  stock: number;
  isAvailable: boolean;
}

export default function ProviderProductsPage() {
  const { data: session } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setProducts(json.data.products || []);
      })
      .catch(() => toast.error("Failed to load products"))
      .finally(() => setLoading(false));
  }, [session]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "PURIFIED": return "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
      case "MINERAL": return "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400";
      case "ALKALINE": return "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400";
      default: return "bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Product Catalog</h1>
          <p className="text-sm text-muted-foreground">
            {products.length} product{products.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 rounded-xl w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add New Product
        </Button>
      </div>

      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
        <Input 
          placeholder="Search products..." 
          className="pl-10 rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-gray-300 dark:placeholder:text-gray-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <Droplet className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-lg font-medium dark:text-gray-300">No products yet</p>
          <p className="text-sm mt-1 dark:text-gray-400">Add your first product to start selling.</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => (
            <Card key={product.id} className="border-none shadow-sm bg-white dark:bg-gray-800/50 overflow-hidden group">
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                  <div className={`p-2 rounded-lg ${getTypeColor(product.type)}`}>
                    <Droplet className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity dark:text-gray-400">
                      <Pencil className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-red-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-lg mt-3 dark:text-white">{product.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{product.size}</p>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="flex justify-between items-center mt-4">
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">₱{product.price}</span>
                  <div className="flex items-center gap-2">
                    <Package className={`h-4 w-4 ${product.stock < 10 ? "text-orange-500" : "text-gray-400 dark:text-gray-500"}`} />
                    <span className={`text-sm font-medium ${product.stock < 10 ? "text-orange-600 dark:text-orange-400" : "dark:text-gray-300"}`}>
                      {product.stock} units
                    </span>
                  </div>
                </div>
                {product.stock < 10 && product.stock > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 text-[10px] text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 p-1.5 rounded-lg">
                    <AlertCircle className="h-3 w-3" />
                    Low stock warning
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-4 pt-0 border-t dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch id={`available-${product.id}`} checked={product.isAvailable} />
                  <Label htmlFor={`available-${product.id}`} className="text-xs font-medium cursor-pointer dark:text-gray-300">
                    {product.isAvailable ? "Available" : "Unavailable"}
                  </Label>
                </div>
                <Badge variant={product.isAvailable ? "default" : "outline"} className="text-[10px] bg-blue-600 dark:text-white">
                  {product.type}
                </Badge>
              </CardFooter>
            </Card>
          ))}

          {/* Add New Card */}
          <button className="h-full min-h-[220px] rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all flex flex-col items-center justify-center gap-2 group">
            <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              <Plus className="h-6 w-6" />
            </div>
            <span className="font-bold text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Add New Product</span>
          </button>
        </div>
      )}
    </div>
  );
}