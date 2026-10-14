import { CartItem, CouponCode } from '@/types';

export interface CouponRule {
  code: CouponCode;
  /** Human-readable reason shown in toast when auto-removed */
  invalidReason: string;
  /** Returns true if the coupon is valid for the given cart */
  isValid(itemTotal: number, usedOneTime: CouponCode[]): boolean;
  /** Returns the discount amount (never exceeds itemTotal) */
  computeDiscount(itemTotal: number): number;
  /** Returns the delivery fee after applying this coupon */
  computeDeliveryFee(itemTotal: number, baseDeliveryFee: number): number;
  /** True if this coupon is consumed on order placement */
  isOneTime: boolean;
}

const baseDelivery = (itemTotal: number) => (itemTotal < 499 ? 40 : 0);

export const COUPON_RULES: Record<CouponCode, CouponRule> = {
  FLAT50: {
    code: 'FLAT50',
    invalidReason: 'FLAT50 requires a minimum order of ₹300.',
    isOneTime: false,
    isValid: (itemTotal) => itemTotal >= 300,
    computeDiscount: (itemTotal) => Math.min(50, itemTotal),
    computeDeliveryFee: (itemTotal) => baseDelivery(itemTotal),
  },
  SAVE10: {
    code: 'SAVE10',
    invalidReason: 'Cart is empty.',
    isOneTime: false,
    isValid: (itemTotal) => itemTotal > 0,
    computeDiscount: (itemTotal) => Math.min(Math.floor(itemTotal * 0.1), 100, itemTotal),
    computeDeliveryFee: (itemTotal) => baseDelivery(itemTotal),
  },
  FREEDEL: {
    code: 'FREEDEL',
    invalidReason: 'Cart is empty.',
    isOneTime: false,
    isValid: (itemTotal) => itemTotal > 0,
    computeDiscount: () => 0,
    computeDeliveryFee: () => 0,
  },
  FIRST100: {
    code: 'FIRST100',
    invalidReason: 'FIRST100 requires a minimum order of ₹200.',
    isOneTime: true,
    isValid: (itemTotal, usedOneTime) =>
      itemTotal >= 200 && !usedOneTime.includes('FIRST100'),
    computeDiscount: (itemTotal) => Math.min(100, itemTotal),
    computeDeliveryFee: (itemTotal) => baseDelivery(itemTotal),
  },
};

export function computeBill(
  items: CartItem[],
  coupon: CouponCode | null,
  usedOneTime: CouponCode[],
) {
  const itemTotal = items.reduce((sum, i) => sum + i.medicine.price * i.qty, 0);
  const baseDeliveryFee = itemTotal < 499 ? 40 : 0;

  if (!coupon || !COUPON_RULES[coupon].isValid(itemTotal, usedOneTime)) {
    const grandTotal = itemTotal + baseDeliveryFee;
    return { itemTotal, discount: 0, deliveryFee: baseDeliveryFee, grandTotal };
  }

  const rule = COUPON_RULES[coupon];
  const discount = rule.computeDiscount(itemTotal);
  const deliveryFee = rule.computeDeliveryFee(itemTotal, baseDeliveryFee);
  const grandTotal = Math.max(0, itemTotal - discount + deliveryFee);
  return { itemTotal, discount, deliveryFee, grandTotal };
}
