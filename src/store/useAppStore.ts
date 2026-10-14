import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { COUPON_RULES } from '@/engine/couponRules';
import { CartItem, CouponCode, Medicine, PersistedState, STORAGE_VERSION } from '@/types';

const STORAGE_KEY = '@plazza/state_v1';
const MAX_RECENT = 5;

interface AppState {
  cartItems: CartItem[];
  appliedCoupon: CouponCode | null;
  recentSearches: string[];
  usedOneTimeCoupons: CouponCode[];
  hydrated: boolean;

  hydrate: () => Promise<void>;
  addToCart: (medicine: Medicine) => void;
  incrementQty: (id: string) => void;
  decrementQty: (id: string) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  applyCoupon: (code: CouponCode) => { success: boolean; message: string };
  removeCoupon: () => void;
  /** Validates current coupon against current cart; removes + returns reason if invalid */
  revalidateCoupon: () => string | null;
  addRecentSearch: (query: string) => void;
  placeOrder: () => void;
}

function persist(state: Pick<AppState, 'cartItems' | 'appliedCoupon' | 'recentSearches' | 'usedOneTimeCoupons'>) {
  const data: PersistedState = {
    version: STORAGE_VERSION,
    cartItems: state.cartItems,
    appliedCoupon: state.appliedCoupon,
    recentSearches: state.recentSearches,
    usedOneTimeCoupons: state.usedOneTimeCoupons,
  };
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => null);
}

export const useAppStore = create<AppState>((set, get) => ({
  cartItems: [],
  appliedCoupon: null,
  recentSearches: [],
  usedOneTimeCoupons: [],
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (
          parsed !== null &&
          typeof parsed === 'object' &&
          'version' in parsed &&
          (parsed as PersistedState).version === STORAGE_VERSION
        ) {
          const s = parsed as PersistedState;
          set({
            cartItems: Array.isArray(s.cartItems) ? s.cartItems : [],
            appliedCoupon: s.appliedCoupon ?? null,
            recentSearches: Array.isArray(s.recentSearches) ? s.recentSearches : [],
            usedOneTimeCoupons: Array.isArray(s.usedOneTimeCoupons) ? s.usedOneTimeCoupons : [],
          });
        }
      }
    } catch {
      // corrupt data — start fresh
    }
    set({ hydrated: true });
  },

  addToCart: (medicine) => {
    const { cartItems } = get();
    const existing = cartItems.find((i) => i.medicine.id === medicine.id);
    let updated: CartItem[];
    if (existing) {
      updated = cartItems.map((i) =>
        i.medicine.id === medicine.id
          ? { ...i, qty: Math.min(i.qty + 1, medicine.maxQty) }
          : i,
      );
    } else {
      updated = [...cartItems, { medicine, qty: 1 }];
    }
    set({ cartItems: updated });
    persist({ ...get(), cartItems: updated });
  },

  incrementQty: (id) => {
    const updated = get().cartItems.map((i) =>
      i.medicine.id === id ? { ...i, qty: Math.min(i.qty + 1, i.medicine.maxQty) } : i,
    );
    set({ cartItems: updated });
    persist({ ...get(), cartItems: updated });
    get().revalidateCoupon();
  },

  decrementQty: (id) => {
    const updated = get()
      .cartItems.map((i) => (i.medicine.id === id ? { ...i, qty: i.qty - 1 } : i))
      .filter((i) => i.qty > 0);
    set({ cartItems: updated });
    persist({ ...get(), cartItems: updated });
    get().revalidateCoupon();
  },

  removeFromCart: (id) => {
    const updated = get().cartItems.filter((i) => i.medicine.id !== id);
    set({ cartItems: updated });
    persist({ ...get(), cartItems: updated });
    get().revalidateCoupon();
  },

  clearCart: () => {
    set({ cartItems: [], appliedCoupon: null });
    persist({ ...get(), cartItems: [], appliedCoupon: null });
  },

  applyCoupon: (code) => {
    const { cartItems, usedOneTimeCoupons } = get();
    const itemTotal = cartItems.reduce((s, i) => s + i.medicine.price * i.qty, 0);
    const rule = COUPON_RULES[code];
    if (!rule) return { success: false, message: 'Invalid coupon code.' };
    if (!rule.isValid(itemTotal, usedOneTimeCoupons)) {
      return { success: false, message: rule.invalidReason };
    }
    set({ appliedCoupon: code });
    persist({ ...get(), appliedCoupon: code });
    return { success: true, message: `${code} applied!` };
  },

  removeCoupon: () => {
    set({ appliedCoupon: null });
    persist({ ...get(), appliedCoupon: null });
  },

  revalidateCoupon: () => {
    const { appliedCoupon, cartItems, usedOneTimeCoupons } = get();
    if (!appliedCoupon) return null;
    const itemTotal = cartItems.reduce((s, i) => s + i.medicine.price * i.qty, 0);
    const rule = COUPON_RULES[appliedCoupon];
    if (!rule.isValid(itemTotal, usedOneTimeCoupons)) {
      set({ appliedCoupon: null });
      persist({ ...get(), appliedCoupon: null });
      return rule.invalidReason;
    }
    return null;
  },

  addRecentSearch: (query) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const prev = get().recentSearches.filter((s) => s !== trimmed);
    const updated = [trimmed, ...prev].slice(0, MAX_RECENT);
    set({ recentSearches: updated });
    persist({ ...get(), recentSearches: updated });
  },

  placeOrder: () => {
    const { appliedCoupon, usedOneTimeCoupons } = get();
    const rule = appliedCoupon ? COUPON_RULES[appliedCoupon] : null;
    const updatedUsed =
      rule?.isOneTime && appliedCoupon && !usedOneTimeCoupons.includes(appliedCoupon)
        ? [...usedOneTimeCoupons, appliedCoupon]
        : usedOneTimeCoupons;
    set({ cartItems: [], appliedCoupon: null, usedOneTimeCoupons: updatedUsed });
    persist({ ...get(), cartItems: [], appliedCoupon: null, usedOneTimeCoupons: updatedUsed });
  },
}));
