"use client";

import { Plus, Minus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Product } from "@/types";
import { useCart } from "@/hooks/use-cart";
import { useState } from "react";
import { toast } from "react-hot-toast";

interface ProductCardProps {
  product: Product;
  station: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
  };
}

export function ProductCard({ product, station }: ProductCardProps) {
  const { addItem, items } = useCart();
  const [quantity, setQuantity] = useState(1);

  const cartItem = items.find((i) => i.product.id === product.id);
  const isInCart = !!cartItem;

  const handleAddToCart = () => {
    addItem(product, station, quantity);
    toast.success(`Added ${quantity} ${product.name} to cart`);
    setQuantity(1);
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-4 flex gap-4 hover:shadow-md transition-shadow">
      <div className="h-20 w-20 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0" aria-hidden="true">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover rounded-xl"
          />
        ) : (
          <div className="text-2xl">💧</div>
        )}
      </div>
      
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-bold text-card-foreground truncate">{product.name}</h4>
            <p className="text-xs text-muted-foreground">{product.size}</p>
          </div>
          <span className="font-bold text-blue-600 dark:text-blue-400">₱{product.price}</span>
        </div>
        
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
          {product.description || "Freshly purified drinking water"}
        </p>

        <div className="mt-auto pt-3 flex items-center justify-between">
          <div className="flex items-center bg-muted rounded-lg p-1" role="group" aria-label={`Quantity for ${product.name}`}>
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:bg-card rounded-md transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-8 text-center text-sm font-semibold" aria-live="polite" aria-atomic="true">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:bg-card rounded-md transition-colors"
              aria-label="Increase quantity"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <Button
            size="sm"
            className="rounded-lg h-9 min-w-[80px]"
            onClick={handleAddToCart}
            aria-label={`Add ${quantity} ${product.name} to cart`}
          >
            <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}