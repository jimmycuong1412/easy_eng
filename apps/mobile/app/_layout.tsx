// Tailwind/NativeWind styles.
import '../global.css';
// Register @easyeng/core adapters (Supabase factory, AsyncStorage, platform)
// before any descendant screen calls a core hook.
import '../src/lib/core-bootstrap';

import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@easyeng/core';

import { Providers } from '../src/components/Providers';

/**
 * Routes the user between the (auth) and (tabs) groups based on session state.
 * Kept inside Providers so core hooks have their adapters registered.
 */
function AuthGate() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#060f33' } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="vocabulary/review" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <Providers>
      <StatusBar style="light" />
      <AuthGate />
    </Providers>
  );
}
