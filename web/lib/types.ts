export type AccountRole = 'customer' | 'owner';

export type User = {
  id: string;
  email: string;
  displayName: string;
  role: AccountRole;
};

export type StockItem = {
  id: string;
  productId: string;
  name: string;
  category: string;
  priceCents: number;
  quantity: number;
  updatedAt: number;
};

export type Drop = {
  id: string;
  productId: string;
  productName: string;
  priceCents: number;
  originalPriceCents: number;
  quantity: number;
  expiresAt: number;
  kind: 'drop' | 'last_crate';
};

export type Shop = {
  id: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  openingHours: string;
  rating: number;
  reviewCount: number;
  pickupMinutes: number;
  stepFree: boolean;
  verified: boolean;
  isOpen: boolean;
  distanceKm: number | null;
  inventory: StockItem[];
  drops: Drop[];
  source?: string;
  category?: string;
};

export type Position = { latitude: number; longitude: number };
