import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { registerExpoPushToken } from '@easyeng/core';

/**
 * Request notification permission, get the Expo push token, and persist it via
 * the shared core RPC. Safe to call after login; no-ops on simulators (no push
 * hardware) and when permission is denied. Returns the token or null.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push tokens require a physical device.
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  // EAS project id is needed to mint an Expo push token.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  const token = tokenResponse.data;

  try {
    await registerExpoPushToken({
      token,
      platform: Platform.OS,
      deviceName: Device.deviceName ?? undefined,
    });
  } catch (err) {
    console.warn('Failed to persist push token:', err);
  }

  return token;
}
