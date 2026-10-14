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
    <View style={styles.permBanner}>
      <Text style={styles.permDebug}>
        📍 {location} · 🔔 {notification}
        {locationCoords
          ? `  · Delivering to: ${locationCoords.lat.toFixed(4)}, ${locationCoords.lng.toFixed(4)}`
          : ''}
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

function RecentSearches({
  searches,
  onTap,
  onClear,
}: {
  searches: string[];
  onTap: (term: string) => void;
  onClear: () => void;
}) {
  if (searches.length === 0) return null;
  return (
    <View style={styles.recentContainer}>
      <View style={styles.recentHeader}>
        <Text style={styles.recentTitle}>Recent Searches</Text>
        <Pressable
          onPress={onClear}
          accessibilityRole="button"
          accessibilityLabel="Clear all recent searches"
          hitSlop={8}
        >
          <Text style={styles.clearAllText}>Clear all</Text>
        </Pressable>
      </View>
      <View style={styles.recentChips}>
        {searches.map((term) => (
          <Pressable
            key={term}
            style={styles.chip}
            onPress={() => onTap(term)}
            accessibilityRole="button"
            accessibilityLabel={`Search for ${term}`}
            hitSlop={4}
          >
            <Text style={styles.chipText}>🕐 {term}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const [query, setQuery] = useState('');

  const recentSearches = useAppStore((s) => s.recentSearches);
  const addRecentSearch = useAppStore((s) => s.addRecentSearch);
  const clearRecentSearches = useAppStore((s) => s.clearRecentSearches);
  const hydrated = useAppStore((s) => s.hydrated);

  const displayList = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MEDICINES;
    return MEDICINES.filter(
      (m) => m.name.toLowerCase().includes(q) || m.salt.toLowerCase().includes(q),
    );
  }, [query]);

  const handleSearch = (text: string) => {
    setQuery(text);
    if (text.trim()) addRecentSearch(text.trim());
  };

  const handleRecentTap = (term: string) => {
    setQuery(term);
  };

  const handleClearQuery = () => setQuery('');

  if (!hydrated) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#208AEF" />
      </View>
    );
  }

  const ListHeader = (
    <>
      <RecentSearches
        searches={recentSearches}
        onTap={handleRecentTap}
        onClear={clearRecentSearches}
      />
      <View style={styles.catalogHeader}>
        <Text style={styles.catalogTitle}>
          {query.trim() ? `Results for "${query.trim()}"` : 'All Medicines'}
        </Text>
        <Text style={styles.catalogCount}>{displayList.length} items</Text>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PermissionBanner />

      {/* Search bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or salt…"
          placeholderTextColor="#999"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => handleSearch(query)}
          returnKeyType="search"
          accessibilityLabel="Search medicines"
          accessibilityHint="Type a medicine name or salt to filter the list"
        />
        {query.length > 0 && (
          <Pressable
            onPress={handleClearQuery}
            style={styles.clearBtn}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={8}
          >
            <Text style={styles.clearText}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Full catalog (filtered when query active) */}
      {displayList.length > 0 ? (
        <FlatList
          data={displayList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MedicineCard medicine={item} />}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      ) : (
        <>
          {ListHeader}
          <View style={styles.center}>
            <Text style={styles.emptyText}>No medicines found for "{query}"</Text>
          </View>
        </>
      )}

      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Permission banner
  permBanner: { backgroundColor: '#E8F4FD', paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
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

  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 14,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, height: 48, fontSize: 15, color: '#1a1a1a' },
  clearBtn: { padding: 6, minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  clearText: { fontSize: 14, color: '#999' },

  // Recent searches
  recentContainer: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 10 },
  recentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  recentTitle: { fontSize: 13, color: '#666', fontWeight: '600' },
  clearAllText: { fontSize: 12, color: '#208AEF', fontWeight: '600' },
  recentChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#E8F4FD',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipText: { fontSize: 13, color: '#208AEF', fontWeight: '600' },

  // Catalog
  catalogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  catalogTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  catalogCount: { fontSize: 12, color: '#888' },

  list: { paddingHorizontal: 14, paddingBottom: 100 },
  emptyText: { fontSize: 15, color: '#888', textAlign: 'center', paddingHorizontal: 24 },
});
