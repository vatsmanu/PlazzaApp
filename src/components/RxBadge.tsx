import { StyleSheet, Text, View } from 'react-native';

export function RxBadge() {
  return (
    <View style={styles.badge} accessibilityLabel="Prescription required">
      <Text style={styles.text}>Rx</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#E53935',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    alignSelf: 'flex-start',
  },
  text: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
