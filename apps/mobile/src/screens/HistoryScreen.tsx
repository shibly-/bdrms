import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'History'>;

export type BillRow = {
  billId: number;
  billingDate: string;
  previousReading: string | number | null;
  currentReading: string | number | null;
  usageQuantity: string | number | null;
  unitPrice: string | number | null;
  totalBill: string | number | null;
  userName: string;
  fullName: string | null;
  gasMeterNo: string | null;
  buildingName: string;
  flatNo: string;
};

type HistoryResponse = { total: number; items: BillRow[] };

export function HistoryScreen({ navigation }: { navigation: Nav }) {
  const { session, signOut } = useAuth();
  const [items, setItems] = useState<BillRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setError(null);
    try {
      const data = await apiFetch<HistoryResponse>('/billing/history', {
        method: 'GET',
        token: session.accessToken,
      });
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => signOut()} hitSlop={12}>
          <Text style={styles.headerLink}>Log out</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, signOut]);

  React.useEffect(() => {
    load();
  }, [load]);

  const fmtNum = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return '—';
    const n = typeof v === 'string' ? Number(v) : v;
    if (Number.isNaN(n)) return String(v);
    return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  const renderItem = ({ item }: { item: BillRow }) => (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>
        {item.buildingName} · Flat {item.flatNo}
      </Text>
      <Text style={styles.rowMeta}>
        {item.billingDate} · {item.userName}
      </Text>
      <Text style={styles.rowDetail}>
        Reading {fmtNum(item.previousReading)} → {fmtNum(item.currentReading)} · Usage{' '}
        {fmtNum(item.usageQuantity)} · Total {fmtNum(item.totalBill)}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.summary}>
        {total} record{total === 1 ? '' : 's'}
        {session?.role === 'user' ? ' (your account)' : ''}
      </Text>
      {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.billId)}
        renderItem={renderItem}
        contentContainerStyle={items.length === 0 ? styles.emptyList : undefined}
        ListEmptyComponent={
          <Text style={styles.empty}>No billing records found.</Text>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerLink: { color: '#2563eb', fontSize: 16, fontWeight: '600' },
  summary: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, color: '#64748b' },
  errorBanner: { color: '#dc2626', paddingHorizontal: 16, paddingBottom: 8 },
  row: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rowTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  rowMeta: { fontSize: 13, color: '#64748b', marginTop: 4 },
  rowDetail: { fontSize: 13, color: '#334155', marginTop: 8, lineHeight: 18 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  empty: { textAlign: 'center', color: '#64748b', padding: 24 },
});
