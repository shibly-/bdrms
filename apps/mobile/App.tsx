import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import type { RootStackParamList } from './src/navigation/types';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { session, ready } = useAuth();

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      key={session ? 'app' : 'auth'}
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#f8fafc' },
        headerTitleStyle: { fontWeight: '700', color: '#0f172a' },
      }}
    >
      {session == null ? (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ title: 'Create resident account' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'LPG billing' }}
          />
          <Stack.Screen
            name="History"
            component={HistoryScreen}
            options={{ title: 'Billing history' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
});
