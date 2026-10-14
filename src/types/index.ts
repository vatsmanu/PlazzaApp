export interface Medicine {
  id: string;
  name: string;
  salt: string;
  price: number;
  maxQty: number;
  rx: boolean;
}

export interface CartItem {
  medicine: Medicine;
  qty: number;
}

export interface BillBreakdown {
  itemTotal: number;
  discount: number;
  deliveryFee: number;
  grandTotal: number;
}

export type CouponCode = 'FLAT50' | 'SAVE10' | 'FREEDEL' | 'FIRST100';

export interface Coupon {
  code: CouponCode;
  description: string;
}

export const COUPONS: Coupon[] = [
  { code: 'FLAT50',   description: '₹50 off on orders above ₹300' },
  { code: 'SAVE10',   description: '10% off (max ₹100)' },
  { code: 'FREEDEL',  description: 'Free delivery' },
  { code: 'FIRST100', description: '₹100 off on first order (min ₹200)' },
];

export const STORAGE_VERSION = 1;

export interface PersistedState {
  version: number;
  cartItems: CartItem[];
  appliedCoupon: CouponCode | null;
  recentSearches: string[];
  usedOneTimeCoupons: CouponCode[];
}
