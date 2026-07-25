import type { User } from "next-auth";

// ─── Auth ───────────────────────────────────────────
export interface AuthUser extends User {
  id: string;
  phone?: string;
  role: "CUSTOMER" | "PROVIDER" | "ADMIN";
}

export interface AuthSession {
  user: AuthUser;
}

// ─── Station ────────────────────────────────────────
export interface StationWithProducts {
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
  rating: number;
  totalReviews: number;
  deliveryFee: number;
  minOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  openingTime: string;
  closingTime: string;
  products: Product[];
  deliveryZones: DeliveryZone[];
  distance?: number;
  createdAt: Date;
}

// ─── Product ────────────────────────────────────────
export interface Product {
  id: string;
  stationId: string;
  name: string;
  type: "PURIFIED" | "MINERAL" | "ALKALINE";
  size: string;
  price: number;
  stock: number;
  isAvailable: boolean;
  image: string | null;
  description: string | null;
}

// ─── Delivery Zone ──────────────────────────────────
export interface DeliveryZone {
  id: string;
  stationId: string;
  barangay: string;
  city: string;
  deliveryFee: number;
  estimatedMinutes: number;
}

// ─── Order ──────────────────────────────────────────
export interface Order {
  id: string;
  userId: string;
  stationId: string;
  status: OrderStatus;
  orderType: "ONCE" | "RECURRING";
  recurringDay: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentId: string | null;
  notes: string | null;
  addressId: string;
  address?: Address;
  items: OrderItem[];
  station?: StationWithProducts;
  review?: Review | null;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus =
  | "PENDING"
  | "ACCEPTED"
  | "PREPARING"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export type PaymentMethod = "COD" | "GCASH" | "CARD" | "PAYMAYA";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  product?: Product;
}

// ─── Review ─────────────────────────────────────────
export interface Review {
  id: string;
  userId: string;
  stationId: string;
  orderId: string;
  rating: number;
  comment: string | null;
  user?: { name: string | null; avatar: string | null };
  createdAt: Date;
}

// ─── Address ────────────────────────────────────────
export interface Address {
  id: string;
  userId: string;
  label: string;
  name: string;
  phone: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  zipCode: string | null;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
}

// ─── Notification ───────────────────────────────────
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: string | null;
  isRead: boolean;
  createdAt: Date;
}

// ─── Cart ───────────────────────────────────────────
export interface CartItem {
  product: Product;
  station: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
  };
  quantity: number;
}

// ─── Search / Filters ──────────────────────────────
export interface SearchFilters {
  query?: string;
  city?: string;
  barangay?: string;
  waterType?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: "distance" | "rating" | "price_low" | "price_high";
}

// ─── API Responses ─────────────────────────────────
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}