/**
 * Plazza — Automated Tests
 * Covers: delivery fee threshold, each coupon rule, SAVE10 cap,
 *         FIRST100 one-time use, auto-removal with reason, maxQty cap,
 *         grand-total invariants, store integration (applyCoupon / placeOrder).
 */

import { COUPON_RULES, computeBill } from '../src/engine/couponRules';
import { useAppStore } from '../src/store/useAppStore';
import { CartItem, CouponCode, Medicine } from '../src/types';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeMedicine(overrides: Partial<Medicine> = {}): Medicine {
  return {
    id: 'm1',
    name: 'Test Med',
    salt: 'TestSalt',
    price: 100,
    maxQty: 5,
    rx: false,
    ...overrides,
  };
}

function makeItem(price: number, qty: number, maxQty = 10, id = 'm1'): CartItem {
  return { medicine: makeMedicine({ id, price, maxQty }), qty };
}

/** Reset the Zustand store to a clean state before each test. */
function resetStore() {
  useAppStore.setState({
    cartItems: [],
    appliedCoupon: null,
    recentSearches: [],
    usedOneTimeCoupons: [],
    hydrated: true,
  });
}

// ─── 1. Delivery fee threshold ───────────────────────────────────────────────

describe('Delivery fee threshold', () => {
  it('charges ₹40 when item total is below ₹499', () => {
    const bill = computeBill([makeItem(100, 4)], null, []);
    expect(bill.itemTotal).toBe(400);
    expect(bill.deliveryFee).toBe(40);
    expect(bill.grandTotal).toBe(440);
  });

  it('is free when item total is exactly ₹499', () => {
    const bill = computeBill([makeItem(499, 1)], null, []);
    expect(bill.deliveryFee).toBe(0);
    expect(bill.grandTotal).toBe(499);
  });

  it('is free when item total exceeds ₹499', () => {
    const bill = computeBill([makeItem(100, 5)], null, []);
    expect(bill.deliveryFee).toBe(0);
    expect(bill.grandTotal).toBe(500);
  });

  it('charges ₹40 at exactly ₹498 (boundary below threshold)', () => {
    const bill = computeBill([makeItem(498, 1)], null, []);
    expect(bill.deliveryFee).toBe(40);
  });
});

// ─── 2. FLAT50 ───────────────────────────────────────────────────────────────

describe('FLAT50 coupon', () => {
  it('is invalid when item total < ₹300', () => {
    expect(COUPON_RULES.FLAT50.isValid(299, [])).toBe(false);
  });

  it('is valid when item total is exactly ₹300', () => {
    expect(COUPON_RULES.FLAT50.isValid(300, [])).toBe(true);
  });

  it('applies ₹50 discount on a qualifying cart', () => {
    const bill = computeBill([makeItem(300, 1)], 'FLAT50', []);
    expect(bill.discount).toBe(50);
    expect(bill.itemTotal).toBe(300);
  });

  it('grand total is itemTotal - 50 + delivery', () => {
    // itemTotal=300 (<499 → delivery=40), discount=50 → grand=290
    const bill = computeBill([makeItem(300, 1)], 'FLAT50', []);
    expect(bill.grandTotal).toBe(300 - 50 + 40);
  });

  it('falls back to no discount when criteria not met', () => {
    const bill = computeBill([makeItem(100, 2)], 'FLAT50', []);
    expect(bill.discount).toBe(0);
  });

  it('is not a one-time coupon', () => {
    expect(COUPON_RULES.FLAT50.isOneTime).toBe(false);
  });
});

// ─── 3. SAVE10 ───────────────────────────────────────────────────────────────

describe('SAVE10 coupon', () => {
  it('applies 10% of item total', () => {
    const bill = computeBill([makeItem(200, 1)], 'SAVE10', []);
    expect(bill.discount).toBe(20);
  });

  it('caps discount at ₹100 regardless of cart size', () => {
    const bill = computeBill([makeItem(2000, 1)], 'SAVE10', []);
    expect(bill.discount).toBe(100);
  });

  it('cap applies at exactly ₹1000 (10% = ₹100)', () => {
    const bill = computeBill([makeItem(1000, 1)], 'SAVE10', []);
    expect(bill.discount).toBe(100);
  });

  it('discount is below cap for totals under ₹1000', () => {
    const bill = computeBill([makeItem(500, 1)], 'SAVE10', []);
    expect(bill.discount).toBe(50);
    expect(bill.discount).toBeLessThan(100);
  });

  it('discount never exceeds item total', () => {
    const bill = computeBill([makeItem(5, 1)], 'SAVE10', []);
    expect(bill.discount).toBeLessThanOrEqual(bill.itemTotal);
  });

  it('is invalid on an empty cart', () => {
    expect(COUPON_RULES.SAVE10.isValid(0, [])).toBe(false);
  });

  it('is not a one-time coupon', () => {
    expect(COUPON_RULES.SAVE10.isOneTime).toBe(false);
  });
});

// ─── 4. FREEDEL ──────────────────────────────────────────────────────────────

describe('FREEDEL coupon', () => {
  it('waives delivery fee on a cart that would otherwise pay ₹40', () => {
    const bill = computeBill([makeItem(100, 1)], 'FREEDEL', []);
    expect(bill.deliveryFee).toBe(0);
    expect(bill.discount).toBe(0);
    expect(bill.grandTotal).toBe(100);
  });

  it('waives delivery fee even when cart already qualifies for free delivery', () => {
    const bill = computeBill([makeItem(500, 1)], 'FREEDEL', []);
    expect(bill.deliveryFee).toBe(0);
  });

  it('is invalid on an empty cart', () => {
    expect(COUPON_RULES.FREEDEL.isValid(0, [])).toBe(false);
  });

  it('is not a one-time coupon', () => {
    expect(COUPON_RULES.FREEDEL.isOneTime).toBe(false);
  });
});

// ─── 5. FIRST100 ─────────────────────────────────────────────────────────────

describe('FIRST100 coupon', () => {
  it('is invalid when item total < ₹200', () => {
    expect(COUPON_RULES.FIRST100.isValid(199, [])).toBe(false);
  });

  it('is valid when item total is exactly ₹200 and not yet used', () => {
    expect(COUPON_RULES.FIRST100.isValid(200, [])).toBe(true);
  });

  it('applies ₹100 discount on a qualifying cart', () => {
    const bill = computeBill([makeItem(200, 1)], 'FIRST100', []);
    expect(bill.discount).toBe(100);
  });

  it('is invalid once it has been used (one-time use)', () => {
    expect(COUPON_RULES.FIRST100.isValid(500, ['FIRST100'])).toBe(false);
  });

  it('gives ₹0 discount when already used', () => {
    const bill = computeBill([makeItem(300, 1)], 'FIRST100', ['FIRST100']);
    expect(bill.discount).toBe(0);
  });

  it('is marked as a one-time coupon', () => {
    expect(COUPON_RULES.FIRST100.isOneTime).toBe(true);
  });

  it('discount is capped at ₹100 (never exceeds item total on a qualifying cart)', () => {
    // itemTotal=200 (exactly at minimum), discount=min(100,200)=100
    const bill = computeBill([makeItem(200, 1)], 'FIRST100', []);
    expect(bill.discount).toBe(100);
    expect(bill.grandTotal).toBeGreaterThanOrEqual(0);
  });

  it('invalidReasonFor returns "already used" message when used', () => {
    const rule = COUPON_RULES.FIRST100 as typeof COUPON_RULES.FIRST100 & {
      invalidReasonFor: (t: number, u: CouponCode[]) => string;
    };
    expect(rule.invalidReasonFor(500, ['FIRST100'])).toMatch(/already been used/i);
  });

  it('invalidReasonFor returns "minimum order" message when total too low', () => {
    const rule = COUPON_RULES.FIRST100 as typeof COUPON_RULES.FIRST100 & {
      invalidReasonFor: (t: number, u: CouponCode[]) => string;
    };
    expect(rule.invalidReasonFor(100, [])).toMatch(/minimum order/i);
  });
});

// ─── 6. FIRST100 one-time use — store integration ────────────────────────────

describe('FIRST100 one-time use (store)', () => {
  beforeEach(resetStore);

  it('marks FIRST100 as used after placeOrder', () => {
    const store = useAppStore.getState();
    store.addToCart(makeMedicine({ price: 300, maxQty: 5 }));
    store.applyCoupon('FIRST100');
    expect(useAppStore.getState().appliedCoupon).toBe('FIRST100');

    store.placeOrder();
    expect(useAppStore.getState().usedOneTimeCoupons).toContain('FIRST100');
    expect(useAppStore.getState().appliedCoupon).toBeNull();
    expect(useAppStore.getState().cartItems).toHaveLength(0);
  });

  it('rejects FIRST100 on second attempt after it has been used', () => {
    const store = useAppStore.getState();
    store.addToCart(makeMedicine({ price: 300, maxQty: 5 }));
    store.applyCoupon('FIRST100');
    store.placeOrder();

    // New order
    store.addToCart(makeMedicine({ price: 300, maxQty: 5 }));
    const result = useAppStore.getState().applyCoupon('FIRST100');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/already been used|minimum/i);
  });

  it('does not double-count FIRST100 in usedOneTimeCoupons', () => {
    useAppStore.setState({ usedOneTimeCoupons: ['FIRST100'] });
    const store = useAppStore.getState();
    store.addToCart(makeMedicine({ price: 300, maxQty: 5 }));
    // Force-set coupon to simulate edge case
    useAppStore.setState({ appliedCoupon: 'FIRST100' });
    store.placeOrder();
    expect(useAppStore.getState().usedOneTimeCoupons.filter((c) => c === 'FIRST100')).toHaveLength(1);
  });
});

// ─── 7. Auto-removal when cart no longer meets coupon criteria ────────────────

describe('Auto-removal via revalidateCoupon (store)', () => {
  beforeEach(resetStore);

  it('removes FLAT50 and fires callback when total drops below ₹300', () => {
    const store = useAppStore.getState();
    // Add two items totalling ₹400, apply FLAT50
    store.addToCart(makeMedicine({ id: 'a', price: 200, maxQty: 5 }));
    store.addToCart(makeMedicine({ id: 'b', price: 200, maxQty: 5 }));
    useAppStore.setState({ appliedCoupon: 'FLAT50' });

    // Remove one item → total drops to ₹200 < ₹300
    store.removeFromCart('b');
    const removed = jest.fn();
    useAppStore.getState().revalidateCoupon(removed);

    expect(useAppStore.getState().appliedCoupon).toBeNull();
    expect(removed).toHaveBeenCalledWith(expect.stringMatching(/FLAT50|minimum/i));
  });

  it('removes FIRST100 and fires callback when total drops below ₹200', () => {
    const store = useAppStore.getState();
    store.addToCart(makeMedicine({ id: 'a', price: 200, maxQty: 5 }));
    useAppStore.setState({ appliedCoupon: 'FIRST100' });

    store.decrementQty('a'); // qty 1→0, item removed → total=0
    const removed = jest.fn();
    useAppStore.getState().revalidateCoupon(removed);

    expect(useAppStore.getState().appliedCoupon).toBeNull();
    expect(removed).toHaveBeenCalledWith(expect.stringMatching(/minimum|200/i));
  });

  it('does not fire callback when coupon is still valid', () => {
    const store = useAppStore.getState();
    store.addToCart(makeMedicine({ id: 'a', price: 300, maxQty: 5 }));
    store.addToCart(makeMedicine({ id: 'b', price: 100, maxQty: 5 }));
    useAppStore.setState({ appliedCoupon: 'FLAT50' });

    store.removeFromCart('b'); // total still ₹300 — still valid
    const removed = jest.fn();
    useAppStore.getState().revalidateCoupon(removed);

    expect(useAppStore.getState().appliedCoupon).toBe('FLAT50');
    expect(removed).not.toHaveBeenCalled();
  });

  it('does nothing when no coupon is applied', () => {
    const removed = jest.fn();
    useAppStore.getState().revalidateCoupon(removed);
    expect(removed).not.toHaveBeenCalled();
  });
});

// ─── 8. maxQty cap (store) ───────────────────────────────────────────────────

describe('maxQty cap (store)', () => {
  beforeEach(resetStore);

  it('addToCart respects maxQty — does not exceed it', () => {
    const med = makeMedicine({ id: 'x', price: 30, maxQty: 2 });
    const store = useAppStore.getState();
    store.addToCart(med); // qty=1
    store.addToCart(med); // qty=2
    store.addToCart(med); // should stay at 2
    const item = useAppStore.getState().cartItems.find((i) => i.medicine.id === 'x');
    expect(item?.qty).toBe(2);
  });

  it('incrementQty does not exceed maxQty', () => {
    const med = makeMedicine({ id: 'y', price: 30, maxQty: 3 });
    useAppStore.setState({ cartItems: [{ medicine: med, qty: 3 }] });
    useAppStore.getState().incrementQty('y');
    const item = useAppStore.getState().cartItems.find((i) => i.medicine.id === 'y');
    expect(item?.qty).toBe(3);
  });

  it('decrementQty removes item when qty reaches 0', () => {
    const med = makeMedicine({ id: 'z', price: 30, maxQty: 3 });
    useAppStore.setState({ cartItems: [{ medicine: med, qty: 1 }] });
    useAppStore.getState().decrementQty('z');
    expect(useAppStore.getState().cartItems).toHaveLength(0);
  });

  it('decrementQty reduces qty by 1 when qty > 1', () => {
    const med = makeMedicine({ id: 'z', price: 30, maxQty: 5 });
    useAppStore.setState({ cartItems: [{ medicine: med, qty: 3 }] });
    useAppStore.getState().decrementQty('z');
    expect(useAppStore.getState().cartItems[0].qty).toBe(2);
  });
});

// ─── 9. applyCoupon store action ─────────────────────────────────────────────

describe('applyCoupon (store)', () => {
  beforeEach(resetStore);

  it('rejects an unknown coupon code', () => {
    useAppStore.setState({ cartItems: [makeItem(300, 1)] });
    const result = useAppStore.getState().applyCoupon('BOGUS' as CouponCode);
    expect(result.success).toBe(false);
  });

  it('rejects FLAT50 when total is below ₹300', () => {
    useAppStore.setState({ cartItems: [makeItem(100, 1)] });
    const result = useAppStore.getState().applyCoupon('FLAT50');
    expect(result.success).toBe(false);
    expect(useAppStore.getState().appliedCoupon).toBeNull();
  });

  it('accepts FLAT50 when total meets minimum', () => {
    useAppStore.setState({ cartItems: [makeItem(300, 1)] });
    const result = useAppStore.getState().applyCoupon('FLAT50');
    expect(result.success).toBe(true);
    expect(useAppStore.getState().appliedCoupon).toBe('FLAT50');
  });

  it('replaces a previously applied coupon', () => {
    useAppStore.setState({ cartItems: [makeItem(500, 1)], appliedCoupon: 'FLAT50' });
    useAppStore.getState().applyCoupon('SAVE10');
    expect(useAppStore.getState().appliedCoupon).toBe('SAVE10');
  });
});

// ─── 10. Grand total invariants ───────────────────────────────────────────────

describe('Grand total invariants', () => {
  const allCoupons: (CouponCode | null)[] = ['FLAT50', 'SAVE10', 'FREEDEL', 'FIRST100', null];

  it('grand total is never negative for any coupon', () => {
    for (const coupon of allCoupons) {
      const bill = computeBill([makeItem(10, 1)], coupon, []);
      expect(bill.grandTotal).toBeGreaterThanOrEqual(0);
    }
  });

  it('discount never exceeds item total for any coupon', () => {
    for (const coupon of allCoupons) {
      const bill = computeBill([makeItem(10, 1)], coupon, []);
      expect(bill.discount).toBeLessThanOrEqual(bill.itemTotal);
    }
  });

  it('grandTotal equals itemTotal + deliveryFee - discount', () => {
    const bill = computeBill([makeItem(300, 1)], 'FLAT50', []);
    expect(bill.grandTotal).toBe(bill.itemTotal - bill.discount + bill.deliveryFee);
  });
});
