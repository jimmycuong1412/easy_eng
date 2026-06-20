import type { ReactNode } from 'react';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/**
 * App-wide providers for the mobile app: gluestack-ui theming + safe-area.
 * Core adapters are registered separately via the side-effect import in the
 * root layout (core-bootstrap), before this renders.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider>
      <GluestackUIProvider config={config}>{children}</GluestackUIProvider>
    </SafeAreaProvider>
  );
}
