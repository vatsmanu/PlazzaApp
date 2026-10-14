import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RxBadge } from '@/components/RxBadge';
import { useAppStore } from '@/store/useAppStore';
import { Medicine } from '@/types';

interface Props {
  medicine: Medicine;
}

export function MedicineCard({ medicine }: Props) {
  const cartItems = useAppStore((s) => s.cartItems);
  const addToCart = useAppStore((s) => s.addToCart);
  const incrementQty = useAppStore((s) => s.incrementQty);
  const decrementQty = useAppStore((s) => s.decrementQty);

  const cartItem = cartItems.find((i) => i.medicine.id === medicine.id);
  const qty = cartItem?.qty ?? 0;
  const atMax = qty >= medicine.maxQty;

  return (
    <View style={styles.card} accessibilityRole="none">
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{medicine.name}</Text>
          {medicine.rx && <RxBadge />}
        </View>
        <Text style={styles.salt}>{medicine.salt}</Text>
        <Text style={styles.price}>₹{medicine.price}</Text>
      </View>

      {qty === 0 ? (
        <Pressable
          style={styles.addBtn}
          onPress={() => addToCart(medicine)}
          accessibilityRole="button"
          accessibilityLabel={`Add ${medicine.name} to cart`}
          hitSlop={8}
        >
          <Text style={styles.addBtnText}>ADD</Text>
        </Pressable>
      ) : (
        <View style={styles.qtyRow} accessibilityLabel={`${medicine.name} quantity ${qty}`}>
          <Pressable
            style={styles.qtyBtn}
            onPress={() => decrementQty(medicine.id)}
            accessibilityRole="button"
            accessibilityLabel="Decrease quantity"
            hitSlop={8}
          >
            <Text style={styles.qtyBtnText}>−</Text>
          </Pressable>
          <Text style={styles.qtyText}>{qty}</Text>
          <Pressable
            style={[styles.qtyBtn, atMax && styles.qtyBtnDisabled]}
            onPress={() => !atMax && incrementQty(medicine.id)}
            accessibilityRole="button"
            accessibilityLabel="Increase quantity"
            accessibilityState={{ disabled: atMax }}
            hitSlop={8}
          >
            <Text style={styles.qtyBtnText}>+</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  info: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', flexShrink: 1 },
  salt: { fontSize: 12, color: '#666' },
  price: { fontSize: 14, fontWeight: '700', color: '#208AEF' },
  addBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 6,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnDisabled: { backgroundColor: '#b0c8e8' },
  qtyBtnText: { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 22 },
  qtyText: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', minWidth: 20, textAlign: 'center' },
});
