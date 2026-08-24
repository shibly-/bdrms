import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiFetch } from '../api/client';
import type { AuthSession } from '../auth/session';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Register'>;

type Building = {
  id: number;
  name: string;
  buildingNo: string | null;
};

type Flat = {
  id: number;
  flatNo: string;
  buildingId: number;
};

type RegisterResponse = {
  accessToken: string;
  role: AuthSession['role'];
  userId: number;
};

export function RegisterScreen({ navigation }: { navigation: Nav }) {
  const { signIn } = useAuth();

  const [fullName, setFullName] = useState('');
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gasMeterNo, setGasMeterNo] = useState('');

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [buildingId, setBuildingId] = useState<number | null>(null);
  const [flatId, setFlatId] = useState<number | null>(null);

  const [loadingBuildings, setLoadingBuildings] = useState(true);
  const [loadingFlats, setLoadingFlats] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<Building[]>('/auth/buildings', {
          method: 'GET',
        });
        if (!cancelled) setBuildings(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load buildings');
        }
      } finally {
        if (!cancelled) setLoadingBuildings(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setFlatId(null);
    setFlats([]);
    if (buildingId == null) return;
    let cancelled = false;
    setLoadingFlats(true);
    (async () => {
      try {
        const data = await apiFetch<Flat[]>(
          `/auth/buildings/${buildingId}/flats`,
          { method: 'GET' },
        );
        if (!cancelled) setFlats(data);
      } catch {
        if (!cancelled) setFlats([]);
      } finally {
        if (!cancelled) setLoadingFlats(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [buildingId]);

  const canSubmit = useMemo(
    () =>
      fullName.trim().length >= 2 &&
      userName.trim().length >= 2 &&
      password.length >= 8 &&
      gasMeterNo.trim().length > 0 &&
      buildingId != null &&
      flatId != null &&
      !submitting,
    [fullName, userName, password, gasMeterNo, buildingId, flatId, submitting],
  );

  const onSubmit = async () => {
    if (buildingId == null || flatId == null) {
      setError('Please select your building and flat.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch<RegisterResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          userName: userName.trim(),
          password,
          fullName: fullName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          buildingId,
          flatId,
          gasMeterNo: gasMeterNo.trim(),
        }),
      });
      if (!res.accessToken || res.role !== 'user') {
        setError('Registration is only available for residents.');
        return;
      }
      await signIn({ accessToken: res.accessToken, role: res.role });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.outer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Create resident account</Text>
        <Text style={styles.sub}>
          Registration is for residents only. Admin and staff accounts are
          managed from the web portal.
        </Text>

        <Text style={styles.label}>Full name</Text>
        <TextInput
          style={styles.input}
          placeholder="Full name"
          value={fullName}
          onChangeText={setFullName}
        />

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          placeholder="Username"
          autoCapitalize="none"
          autoCorrect={false}
          value={userName}
          onChangeText={setUserName}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="At least 8 characters"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Text style={styles.label}>Email (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Phone (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Phone number"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        <Text style={styles.label}>Building</Text>
        {loadingBuildings ? (
          <ActivityIndicator style={styles.inlineSpinner} />
        ) : buildings.length === 0 ? (
          <Text style={styles.muted}>No buildings available.</Text>
        ) : (
          <View style={styles.chipWrap}>
            {buildings.map((b) => {
              const selected = b.id === buildingId;
              return (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setBuildingId(b.id)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {b.buildingNo ? `${b.buildingNo} (${b.name})` : b.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={styles.label}>Flat</Text>
        {buildingId == null ? (
          <Text style={styles.muted}>Select a building first.</Text>
        ) : loadingFlats ? (
          <ActivityIndicator style={styles.inlineSpinner} />
        ) : flats.length === 0 ? (
          <Text style={styles.muted}>No flats found for this building.</Text>
        ) : (
          <View style={styles.chipWrap}>
            {flats.map((f) => {
              const selected = f.id === flatId;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setFlatId(f.id)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {f.flatNo}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={styles.label}>Gas meter number</Text>
        <TextInput
          style={styles.input}
          placeholder="Gas meter number"
          autoCapitalize="characters"
          autoCorrect={false}
          value={gasMeterNo}
          onChangeText={setGasMeterNo}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={!canSubmit}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigation.goBack()}
          disabled={submitting}
        >
          <Text style={styles.linkMuted}>Already registered? </Text>
          <Text style={styles.link}>Sign in</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
    gap: 6,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  sub: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 16,
    backgroundColor: '#fff',
    marginTop: 4,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  chipText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#fff',
  },
  muted: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 6,
  },
  inlineSpinner: {
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#dc2626',
    fontSize: 14,
    marginTop: 10,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  linkMuted: {
    color: '#64748b',
    fontSize: 14,
  },
  link: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '700',
  },
});
