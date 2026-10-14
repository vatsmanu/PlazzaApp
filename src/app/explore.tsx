import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { RxBadge } from '@/components/RxBadge';
import { computeBill } from '@/engine/couponRules';
import { useAppStore } from '@/store/useAppStore';
import { COUPONS, CouponCode } from '@/types';

export default function CartScreen() {
  const cartItems = useAppStore((s) => s.cartItems);
  const appliedCoupon = useAppStore((s) => s.appliedCoupon);
  const usedOneTimeCoupons = useAppStore((s) => s.usedOneTimeCoupons);
  const incrementQty = useAppStore((s) => s.incrementQty);
  const decrementQty = useAppStore((s) => s.decrementQty);
  const removeFromCart = useAppStore((s) => s.removeFromCart);
  const applyCoupon = useAppStore((s) => s.applyCoupon);
  const removeCoupon = useAppStore((s) => s.removeCoupon);
  const revalidateCoupon = useAppStore((s) => s.revalidateCoupon);
  const placeOrder = useAppStore((s) => s.placeOrder);

  const [couponInput, setCouponInput] = useState('');
  const prevCoupon = useRef(appliedCoupon);

  // Show toast when coupon is auto-removed
  useEffect(() => {
    if (prevCoupon.current && !appliedCoupon) {
      // coupon was removed — revalidateCoupon already ran, show toast
    }
    prevCoupon.current = appliedCoupon;
  }, [appliedCoupon]);

  // Revalidate whenever cart changes
  useEffect(() => {
    const reason = revalidateCoupon();
    if (reason) {
      Toast.show({ type: 'error', text1: 'Coupon removed', text2: reason, visibilityTime: 3000 });
    }
  }, [cartItems]); // eslint-disable-line react-hooks/exhaustive-deps

  const bill = computeBill(cartItems, appliedCoupon, usedOneTimeCoupons);

  const handleApplyCoupon = () => {
    const code = couponInput.trim().toUpperCase() as CouponCode;
    const result = applyCoupon(code);
    if (result.success) {
      Toast.show({ type: 'success', text1: result.message, visibilityTime: 2000 });
      setCouponInput('');
    } else {
      Toast.show({ type: 'error', text1: 'Coupon invalid', text2: result.message, visibilityTime: 3000 });
    }
  };

  const handlePlaceOrder = () => {
    Alert.alert('Order Placed! 🎉', 'Your medicines will arrive in minutes.', [
      { text: 'OK', onPress: placeOrder },
    ]);
  };

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <Text style={styles.emptySubText}>Search for medicines in the Home tab</Text>
        </View>
        <Toast />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Cart Items</Text>

        {cartItems.map((item) => {
          const atMax = item.qty >= item.medicine.maxQty;
          return (
            <View key={item.medicine.id} style={styles.cartItem}>
              <View style={styles.cartInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.cartName}>{item.medicine.name}</Text>
                  {item.medicine.rx && <RxBadge />}
                </View>
                <Text style={styles.cartSalt}>{item.medicine.salt}</Text>
                <Text style={styles.cartPrice}>₹{item.medicine.price} × {item.qty} = ₹{item.medicine.price * item.qty}</Text>
              </View>
              <View style={styles.cartControls}>
                <Pressable
                  style={styles.qtyBtn}
                  onPress={() => decrementQty(item.medicine.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Decrease ${item.medicine.name} quantity`}
                  hitSlop={8}
                >
                  <Text style={styles.qtyBtnText}>−</Text>
                </Pressable>
                <Text style={styles.qtyText}>{item.qty}</Text>
                <Pressable
                  style={[styles.qtyBtn, atMax && styles.qtyBtnDisabled]}
                  onPress={() => !atMax && incrementQty(item.medicine.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Increase ${item.medicine.name} quantity`}
                  accessibilityState={{ disabled: atMax }}
                  hitSlop={8}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </Pressable>
                <Pressable
                  style={styles.removeBtn}
                  onPress={() => removeFromCart(item.medicine.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${item.medicine.name} from cart`}
                  hitSlop={8}
                >
                  <Text style={styles.removeBtnText}>🗑</Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        {/* Coupon Section */}
        <Text style={styles.sectionTitle}>Apply Coupon</Text>
        <View style={styles.couponRow}>
          <TextInput
            style={styles.couponInput}
            placeholder="Enter coupon code"
            placeholderTextColor="#999"
            value={couponInput}
            onChangeText={setCouponInput}
            autoCapitalize="characters"
            accessibilityLabel="Coupon code input"
          />
          <Pressable
            style={styles.applyBtn}
            onPress={handleApplyCoupon}
            accessibilityRole="button"
            accessibilityLabel="Apply coupon"
            hitSlop={8}
          >
            <Text style={styles.applyBtnText}>Apply</Text>
          </Pressable>
        </View>

        {appliedCoupon && (
          <View style={styles.appliedCoupon} accessibilityLabel={`Coupon ${appliedCoupon} applied`}>
            <Text style={styles.appliedCouponText}>✅ {appliedCoupon} applied</Text>
            <Pressable
              onPress={removeCoupon}
              accessibilityRole="button"
              accessibilityLabel="Remove coupon"
              hitSlop={8}
            >
              <Text style={styles.removeCouponText}>Remove</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.couponHints}>
          {COUPONS.map((c) => {
            const used = usedOneTimeCoupons.includes(c.code);
            return (
              <Pressable
                key={c.code}
                style={[styles.couponChip, used && styles.couponChipUsed]}
                onPress={() => !used && setCouponInput(c.code)}
                accessibilityRole="button"
                accessibilityLabel={`${c.code}: ${c.description}${used ? ', already used' : ''}`}
                accessibilityState={{ disabled: used }}
                hitSlop={4}
              >
                <Text style={[styles.couponChipCode, used && styles.couponChipUsedText]}>{c.code}</Text>
                <Text style={[styles.couponChipDesc, used && styles.couponChipUsedText]}>{c.description}</Text>
                {used && <Text style={styles.usedLabel}>Used</Text>}
              </Pressable>
            );
          })}
        </View>

        {/* Bill Breakdown */}
        <Text style={styles.sectionTitle}>Bill Breakdown</Text>
        <View style={styles.bill}>
          <BillRow label="Item Total" value={`₹${bill.itemTotal}`} />
          <BillRow label="Discount" value={bill.discount > 0 ? `-₹${bill.discount}` : '₹0'} highlight={bill.discount > 0} />
          <BillRow label="Delivery Fee" value={bill.deliveryFee === 0 ? 'FREE' : `₹${bill.deliveryFee}`} highlight={bill.deliveryFee === 0} />
          <View style={styles.divider} />
          <BillRow label="Grand Total" value={`₹${bill.grandTotal}`} bold />
        </View>

        <Pressable
          style={styles.placeOrderBtn}
          onPress={handlePlaceOrder}
          accessibilityRole="button"
          accessibilityLabel="Place order"
        >
          <Text style={styles.placeOrderText}>Place Order · ₹{bill.grandTotal}</Text>
        </Pressable>
      </ScrollView>
      <Toast />
    </SafeAreaView>
  );
}

function BillRow({ label, value, highlight, bold }: { label: string; value: string; highlight?: boolean; bold?: boolean }) {
  return (
    <View style={styles.billRow}>
      <Text style={[styles.billLabel, bold && styles.billBold]}>{label}</Text>
      <Text style={[styles.billValue, highlight && styles.billHighlight, bold && styles.billBold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  emptySubText: { fontSize: 14, color: '#888' },
  scroll: { padding: 14, paddingBottom: 100 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginTop: 16, marginBottom: 10 },
  cartItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartInfo: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cartName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', flexShrink: 1 },
  cartSalt: { fontSize: 12, color: '#666' },
  cartPrice: { fontSize: 13, fontWeight: '600', color: '#208AEF' },
  cartControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 6,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnDisabled: { backgroundColor: '#b0c8e8' },
  qtyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', lineHeight: 20 },
  qtyText: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', minWidth: 18, textAlign: 'center' },
  removeBtn: { padding: 4, minWidth: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  removeBtnText: { fontSize: 16 },
  couponRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  couponInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: '#1a1a1a',
    elevation: 1,
    fontWeight: '700',
    letterSpacing: 1,
  },
  applyBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 10,
    paddingHorizontal: 20,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  appliedCoupon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  appliedCouponText: { fontSize: 13, fontWeight: '700', color: '#2E7D32' },
  removeCouponText: { fontSize: 13, color: '#C62828', fontWeight: '600' },
  couponHints: { gap: 8, marginBottom: 4 },
  couponChip: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  couponChipUsed: { backgroundColor: '#F5F5F5', borderColor: '#E0E0E0' },
  couponChipCode: { fontSize: 13, fontWeight: '700', color: '#208AEF', marginBottom: 2 },
  couponChipDesc: { fontSize: 12, color: '#555' },
  couponChipUsedText: { color: '#aaa' },
  usedLabel: { fontSize: 11, color: '#aaa', marginTop: 2, fontStyle: 'italic' },
  bill: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    gap: 10,
    marginBottom: 16,
  },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  billLabel: { fontSize: 14, color: '#555' },
  billValue: { fontSize: 14, color: '#1a1a1a', fontWeight: '600' },
  billHighlight: { color: '#2E7D32', fontWeight: '700' },
  billBold: { fontWeight: '700', fontSize: 16, color: '#1a1a1a' },
  divider: { height: 1, backgroundColor: '#E0E0E0' },
  placeOrderBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 3,
    minHeight: 56,
    justifyContent: 'center',
  },
  placeOrderText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
