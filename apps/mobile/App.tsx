import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { useAuth, useGemsBalance } from '@easyeng/core';

/**
 * Phase 4 smoke screen: proves the shared @easyeng/core data layer works on
 * React Native via the injected mobile adapters (AsyncStorage + RN Supabase
 * client). Logs in with email/password and shows the gems balance — the same
 * useAuth / useGemsBalance hooks the web app uses.
 */
function SignedInPanel() {
  const { user, signOut } = useAuth();
  const { balance, isLoading } = useGemsBalance();

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Signed in</Text>
      <Text style={styles.muted}>{user?.email}</Text>
      <View style={styles.gemRow}>
        <Text style={styles.gemLabel}>Gems balance</Text>
        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <Text style={styles.gemValue}>{balance}</Text>
        )}
      </View>
      <Pressable style={[styles.button, styles.secondary]} onPress={signOut}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

function SignInForm() {
  const { signIn, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>EasyEng</Text>
      <Text style={styles.muted}>Sign in to continue</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error.message}</Text> : null}
      <Pressable
        style={styles.button}
        disabled={isLoading}
        onPress={() => {
          void signIn(email, password).catch(() => {
            /* error surfaced via the error state above */
          });
        }}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign in</Text>
        )}
      </Pressable>
    </View>
  );
}

export default function App() {
  const { user, isLoading } = useAuth();

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      {isLoading ? (
        <ActivityIndicator size="large" />
      ) : user ? (
        <SignedInPanel />
      ) : (
        <SignInForm />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1a4a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  panel: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#13205c',
    borderRadius: 16,
    padding: 24,
    gap: 12,
  },
  heading: { color: '#fff', fontSize: 24, fontWeight: '700' },
  muted: { color: '#9fb0e0', fontSize: 14, marginBottom: 8 },
  input: {
    backgroundColor: '#0d1a4a',
    borderColor: '#2a3a7a',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#7c5cff',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  secondary: { backgroundColor: '#2a3a7a' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#ff7a59', fontSize: 13 },
  gemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0d1a4a',
    borderRadius: 10,
    padding: 16,
    marginVertical: 8,
  },
  gemLabel: { color: '#9fb0e0', fontSize: 14 },
  gemValue: { color: '#ffd166', fontSize: 28, fontWeight: '700' },
});
