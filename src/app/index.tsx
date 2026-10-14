import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { MedicineCard } from '@/components/MedicineCard';
import catalog from '@/data/catalog.json';
import { usePermissions } from '@/hooks/usePermissions';
import { useAppStore } from '@/store/useAppStore';
import { Medicine } from '@/types';

const MEDICINES = catalog as Medicine[];

function PermissionBanner() {
  const { location, notification, locationCoords, requestAll, openSettings } = usePermissions();

  const blocked = location === 'blocked' || notification === 'blocked';
  const allGranted = location === 'granted' && notification === 'granted';

  useEffect(() => {
    if (location === 'undetermined' || notification === 'undetermined') {
      requestAll();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.permBanner} accessibilityRole="none">
      <Text style={styles.permDebug}>
        📍 {location} · 🔔 {notification}
        {locationCoords ? `  · Delivering to: ${locationCoords.lat.toFixed(4)}, ${locationCoords.lng.toFixed(4)}` : ''}
      </Text>
      {blocked && (
        <View style={styles.blockedRow}>
          <Text style={styles.blockedText}>
            {location === 'blocked' ? 'Location' : 'Notification'} permission blocked.
          </Text>
          <Pressable
            style={styles.settingsBtn}
            onPress={openSettings}
            accessibilityRole="button"
            accessibilityLabel="Open app settings to grant permission"
            hitSlop={8}
          >
            <Text style={styles.settingsBtnText}>Open Settings</Text>
          </Pressable>
        </View>
      )}
      {!allGranted && !blocked && (
        <Pressable
          style={styles.grantBtn}
          onPress={requestAll}
          accessibilityRole="button"
          accessibilityLabel="Grant location and notification permissions"
          hitSlop={8}
        >
          <Text style={styles.grantBtnText}>Grant Permissions</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const recentSearches = useAppStore((s) => s.recentSearches);
  const addRecentSearch = useAppStore((s) => s.addRecentSearch);
  const hydrated = useAppStore((s) => s.hydrated);

  const results = useMemo(() => {
    if (!submitted || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    return MEDICINES.filter(
      (m) => m.name.toLowerCase().includes(q) || m.salt.toLowerCase().includes(q),
    );
  }, [query, submitted]);

  const handleSearch = () => {
    if (!query.trim()) return;
    setLoading(true);
    setSubmitted(true);
    addRecentSearch(query.trim());
    // Simulate async search
    setTimeout(() => setLoading(false), 300);
  };

  const handleRecentTap = (term: string) => {
    setQuery(term);
    setSubmitted(true);
    setLoading(true);
    setTimeout(() => setLoading(false), 300);
  };

  const handleClear = () => {
    setQuery('');
    setSubmitted(false);
    setLoading(false);
  };

  if (!hydrated) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#208AEF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PermissionBanner />

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search medicines by name or salt…"
          placeholderTextColor="#999"
          value={query}
          onChangeText={(t) => { setQuery(t); if (!t) handleClear(); }}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          accessibilityLabel="Search medicines"
          accessibilityHint="Type a medicine name or salt and press search"
        />
        {query.length > 0 && (
          <Pressable onPress={handleClear} style={styles.clearBtn} accessibilityLabel="Clear search" hitSlop={8}>
            <Text style={styles.clearText}>✕</Text>
          </Pressable>
        )}
        <Pressable
          style={styles.searchBtn}
          onPress={handleSearch}
          accessibilityRole="button"
          accessibilityLabel="Search"
          hitSlop={8}
        >
          <Text style={styles.searchBtnText}>🔍</Text>
        </Pressable>
      </View>

      {!submitted && recentSearches.length > 0 && (
        <View style={styles.recentContainer}>
          <Text style={styles.recentTitle}>Recent Searches</Text>
          <View style={styles.recentChips}>
            {recentSearches.map((term) => (
              <Pressable
                key={term}
                style={styles.chip}
                onPress={() => handleRecentTap(term)}
                accessibilityRole="button"
                accessibilityLabel={`Search for ${term}`}
                hitSlop={4}
              >
                <Text style={styles.chipText}>{term}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#208AEF" />
        </View>
      )}

      {!loading && submitted && results.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No medicines found for "{query}"</Text>
        </View>
      )}

      {!loading && results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MedicineCard medicine={item} />}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {!submitted && recentSearches.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Search for medicines above</Text>
        </View>
      )}

      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  permBanner: {
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  permDebug: { fontSize: 11, color: '#555', fontFamily: 'monospace' },
  blockedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  blockedText: { fontSize: 12, color: '#C62828', flex: 1 },
  settingsBtn: {
    backgroundColor: '#C62828',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 44,
    justifyContent: 'center',
  },
  settingsBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  grantBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  grantBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: '#1a1a1a',
  },
  clearBtn: { padding: 6 },
  clearText: { fontSize: 14, color: '#999' },
  searchBtn: { padding: 8, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  searchBtnText: { fontSize: 18 },
  recentContainer: { paddingHorizontal: 14, marginBottom: 8 },
  recentTitle: { fontSize: 13, color: '#666', marginBottom: 8, fontWeight: '600' },
  recentChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#E8F4FD',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipText: { fontSize: 13, color: '#208AEF', fontWeight: '600' },
  list: { paddingHorizontal: 14, paddingBottom: 100 },
  emptyText: { fontSize: 15, color: '#888', textAlign: 'center', paddingHorizontal: 24 },
});
