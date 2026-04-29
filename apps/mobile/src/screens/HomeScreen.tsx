import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

type UnitConfig = { gasUnitName: string; gasUnitPrice: number };

export function HomeScreen({
  navigation,
}: {
  navigation: Nav;
}) {
  const { session, signOut } = useAuth();
  const [unit, setUnit] = useState<UnitConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setError(null);
    try {
      const data = await apiFetch<UnitConfig>('/billing/unit-config', {
        method: 'GET',
        token: session.accessToken,
      });
      setUnit(data);
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

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const roleLabel =
    session?.role === 'admin'
      ? 'Administrator'
      : session?.role === 'staff'
        ? 'Staff'
        : 'Resident';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.rolePill}>{roleLabel}</Text>
      {loading ? (
        <ActivityIndicator style={styles.spinner} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : unit ? (
        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Current gas unit</Text>
          <Text style={styles.panelValue}>{unit.gasUnitName}</Text>
          <Text style={styles.panelLabel}>Price per unit</Text>
          <Text style={styles.panelValue}>
            {unit.gasUnitPrice.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => navigation.navigate('History')}
      >
        <Text style={styles.secondaryBtnText}>Gas billing history</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, gap: 16 },
  headerLink: { color: '#2563eb', fontSize: 16, fontWeight: '600' },
  rolePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    fontSize: 13,
    fontWeight: '600',
  },
  spinner: { marginVertical: 24 },
  error: { color: '#dc2626' },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  panelLabel: { fontSize: 13, color: '#64748b' },
  panelValue: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  secondaryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
