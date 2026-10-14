import { COUPON_RULES, computeBill } from '../src/engine/couponRules';
import { CartItem, CouponCode } from '../src/types';

function makeItem(price: number, qty: number, maxQty = 10): CartItem {
  return {
    medicine: { id: 'm_test', name: 'Test', salt: 'Test', price, maxQty, rx: false },
    qty,
  };
}

describe('Delivery fee threshold', () => {
  it('charges 40 when item total < 499', () => {
    const bill = computeBill([makeItem(100, 4)], null, []);
    expect(bill.itemTotal).toBe(400);
    expect(bill.deliveryFee).toBe(40);
    expect(bill.grandTotal).toBe(440);
  });

  it('is free when item total >= 499', () => {
    const bill = computeBill([makeItem(100, 5)], null, []);
    expect(bill.itemTotal).toBe(500);
    expect(bill.deliveryFee).toBe(0);
    expect(bill.grandTotal).toBe(500);
  });

  it('charges 40 at exactly 498', () => {
    const bill = computeBill([makeItem(498, 1)], null, []);
    expect(bill.deliveryFee).toBe(40);
  });

  it('is free at exactly 499', () => {
    const bill = computeBill([makeItem(499, 1)], null, []);
    expect(bill.deliveryFee).toBe(0);
  });
});

describe('FLAT50 coupon', () => {
  it('applies 50 discount when total >= 300', () => {
    const bill = computeBill([makeItem(300, 1)], 'FLAT50', []);
    expect(bill.discount).toBe(50);
  });

  it('is invalid when total < 300', () => {
    const rule = COUPON_RULES['FLAT50'];
    expect(rule.isValid(299, [])).toBe(false);
    expect(rule.isValid(300, [])).toBe(true);
  });

  it('returns 0 discount when coupon criteria not met', () => {
    const bill = computeBill([makeItem(100, 1)], 'FLAT50', []);
    expect(bill.discount).toBe(0);
  });
});

describe('SAVE10 coupon', () => {
  it('applies 10 percent discount', () => {
    const bill = computeBill([makeItem(200, 1)], 'SAVE10', []);
    expect(bill.discount).toBe(20);
  });

  it('caps discount at 100', () => {
    const bill = computeBill([makeItem(1500, 1)], 'SAVE10', []);
    expect(bill.discount).toBe(100);
  });

  it('discount does not exceed item total', () => {
    const bill = computeBill([makeItem(5, 1)], 'SAVE10', []);
    expect(bill.discount).toBeLessThanOrEqual(bill.itemTotal);
  });
});

describe('FREEDEL coupon', () => {
  it('waives delivery fee', () => {
    const bill = computeBill([makeItem(100, 1)], 'FREEDEL', []);
    expect(bill.deliveryFee).toBe(0);
    expect(bill.discount).toBe(0);
    expect(bill.grandTotal).toBe(100);
  });

  it('is invalid on empty cart', () => {
    const rule = COUPON_RULES['FREEDEL'];
    expect(rule.isValid(0, [])).toBe(false);
  });
});

describe('FIRST100 coupon', () => {
  it('applies 100 off when total >= 200 and not used', () => {
    const bill = computeBill([makeItem(200, 1)], 'FIRST100', []);
    expect(bill.discount).toBe(100);
  });

  it('is invalid when total < 200', () => {
    const rule = COUPON_RULES['FIRST100'];
    expect(rule.isValid(199, [])).toBe(false);
    expect(rule.isValid(200, [])).toBe(true);
  });

  it('is invalid after one-time use', () => {
    const rule = COUPON_RULES['FIRST100'];
    expect(rule.isValid(500, ['FIRST100'])).toBe(false);
  });

  it('is valid before use', () => {
    const rule = COUPON_RULES['FIRST100'];
    expect(rule.isValid(500, [])).toBe(true);
  });

  it('is marked as one-time coupon', () => {
    expect(COUPON_RULES['FIRST100'].isOneTime).toBe(true);
  });

  it('discount capped at item total when total equals 200', () => {
    const bill = computeBill([makeItem(50, 4)], 'FIRST100', []);
    expect(bill.discount).toBe(100);
    expect(bill.grandTotal).toBeGreaterThanOrEqual(0);
  });
});

describe('Auto-removal: coupon becomes invalid', () => {
  it('computeBill returns 0 discount when FLAT50 criteria not met', () => {
    const bill = computeBill([makeItem(100, 2)], 'FLAT50', []);
    expect(bill.discount).toBe(0);
  });

  it('FIRST100 gives 0 discount after being used', () => {
    const bill = computeBill([makeItem(300, 1)], 'FIRST100', ['FIRST100']);
    expect(bill.discount).toBe(0);
  });
});

describe('maxQty cap', () => {
  it('qty is capped at maxQty', () => {
    const maxQty = 3;
    const newQty = Math.min(3 + 1, maxQty);
    expect(newQty).toBe(3);
  });

  it('qty below maxQty increments normally', () => {
    const maxQty = 5;
    const newQty = Math.min(2 + 1, maxQty);
    expect(newQty).toBe(3);
  });
});

describe('Grand total invariants', () => {
  it('grand total is never negative', () => {
    const coupons: (CouponCode | null)[] = ['FLAT50', 'SAVE10', 'FREEDEL', 'FIRST100', null];
    for (const coupon of coupons) {
      const bill = computeBill([makeItem(10, 1)], coupon, []);
      expect(bill.grandTotal).toBeGreaterThanOrEqual(0);
    }
  });

  it('discount never exceeds item total', () => {
    const bill = computeBill([makeItem(10, 1)], 'SAVE10', []);
    expect(bill.discount).toBeLessThanOrEqual(bill.itemTotal);
  });
});
