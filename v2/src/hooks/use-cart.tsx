"use client";

import { createContext, useContext, useReducer, ReactNode } from "react";
import type { CartItem, Product } from "@/types";

// Action types
type CartAction =
  | { type: "ADD_ITEM"; payload: { product: Product; station: CartItem["station"]; quantity?: number } }
  | { type: "REMOVE_ITEM"; payload: { productId: string } }
  | { type: "UPDATE_QUANTITY"; payload: { productId: string; quantity: number } }
  | { type: "CLEAR_CART" };

interface CartState {
  items: CartItem[];
  stationId: string | null;
  stationName: string | null;
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const quantityToAdd = action.payload.quantity ?? 1;
      const existingIndex = state.items.findIndex(
        (item) => item.product.id === action.payload.product.id
      );

      // If adding from a different station, clear cart first
      if (state.stationId && state.stationId !== action.payload.station.id) {
        return {
          items: [
            {
              product: action.payload.product,
              station: action.payload.station,
              quantity: quantityToAdd,
            },
          ],
          stationId: action.payload.station.id,
          stationName: action.payload.station.name,
        };
      }

      if (existingIndex >= 0) {
        const newItems = [...state.items];
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: newItems[existingIndex].quantity + quantityToAdd,
        };
        return { ...state, items: newItems };
      }

      return {
        items: [
          ...state.items,
          {
            product: action.payload.product,
            station: action.payload.station,
            quantity: quantityToAdd,
          },
        ],
        stationId: action.payload.station.id,
        stationName: action.payload.station.name,
      };
    }
    case "REMOVE_ITEM": {
      const newItems = state.items.filter(
        (item) => item.product.id !== action.payload.productId
      );
      if (newItems.length === 0) {
        return { items: [], stationId: null, stationName: null };
      }
      return { ...state, items: newItems };
    }
    case "UPDATE_QUANTITY": {
      if (action.payload.quantity <= 0) {
        return cartReducer(state, {
          type: "REMOVE_ITEM",
          payload: { productId: action.payload.productId },
        });
      }
      return {
        ...state,
        items: state.items.map((item) =>
          item.product.id === action.payload.productId
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
      };
    }
    case "CLEAR_CART":
      return { items: [], stationId: null, stationName: null };
    default:
      return state;
  }
}

interface CartContextValue {
  items: CartItem[];
  stationId: string | null;
  stationName: string | null;
  itemCount: number;
  subtotal: number;
  addItem: (product: Product, station: CartItem["station"], quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

const initialState: CartState = {
  items: [],
  stationId: null,
  stationName: null,
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = state.items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const value: CartContextValue = {
    items: state.items,
    stationId: state.stationId,
    stationName: state.stationName,
    itemCount,
    subtotal,
    addItem: (product, station, quantity) =>
      dispatch({ type: "ADD_ITEM", payload: { product, station, quantity } }),
    removeItem: (productId) =>
      dispatch({ type: "REMOVE_ITEM", payload: { productId } }),
    updateQuantity: (productId, quantity) =>
      dispatch({ type: "UPDATE_QUANTITY", payload: { productId, quantity } }),
    clearCart: () => dispatch({ type: "CLEAR_CART" }),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}