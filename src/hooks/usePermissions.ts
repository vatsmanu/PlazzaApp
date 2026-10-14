import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';

export type PermStatus = 'undetermined' | 'granted' | 'denied' | 'blocked';

export interface PermissionsState {
  location: PermStatus;
  notification: PermStatus;
  locationCoords: { lat: number; lng: number } | null;
  requestAll: () => Promise<void>;
  openSettings: () => void;
}

function toStatus(granted: boolean, canAskAgain: boolean): PermStatus {
  if (granted) return 'granted';
  if (canAskAgain) return 'denied';
  return 'blocked';
}

async function safeGetLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    const Location = await import('expo-location');
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

async function safeCheckLocation(): Promise<{ granted: boolean; canAskAgain: boolean }> {
  try {
    const Location = await import('expo-location');
    return await Location.getForegroundPermissionsAsync();
  } catch {
    return { granted: false, canAskAgain: false };
  }
}

async function safeRequestLocation(): Promise<{ granted: boolean; canAskAgain: boolean }> {
  try {
    const Location = await import('expo-location');
    return await Location.requestForegroundPermissionsAsync();
  } catch {
    return { granted: false, canAskAgain: false };
  }
}

async function safeCheckNotification(): Promise<{ granted: boolean; canAskAgain: boolean }> {
  try {
    const Notifications = await import('expo-notifications');
    return await Notifications.getPermissionsAsync();
  } catch {
    return { granted: false, canAskAgain: true };
  }
}

async function safeRequestNotification(): Promise<{ granted: boolean; canAskAgain: boolean }> {
  try {
    const Notifications = await import('expo-notifications');
    return await Notifications.requestPermissionsAsync();
  } catch {
    return { granted: false, canAskAgain: true };
  }
}

export function usePermissions(): PermissionsState {
  const [location, setLocation] = useState<PermStatus>('undetermined');
  const [notification, setNotification] = useState<PermStatus>('undetermined');
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);

  const checkStatuses = useCallback(async () => {
    const locPerm = await safeCheckLocation();
    setLocation(toStatus(locPerm.granted, locPerm.canAskAgain));
    if (locPerm.granted) {
      const coords = await safeGetLocation();
      if (coords) setLocationCoords(coords);
    }
    const notifPerm = await safeCheckNotification();
    setNotification(toStatus(notifPerm.granted, notifPerm.canAskAgain));
  }, []);

  const requestAll = useCallback(async () => {
    const locResult = await safeRequestLocation();
    setLocation(toStatus(locResult.granted, locResult.canAskAgain));
    if (locResult.granted) {
      const coords = await safeGetLocation();
      if (coords) setLocationCoords(coords);
    }
    const notifResult = await safeRequestNotification();
    setNotification(toStatus(notifResult.granted, notifResult.canAskAgain));
  }, []);

  const openSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  useEffect(() => {
    checkStatuses();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkStatuses();
    });
    return () => sub.remove();
  }, [checkStatuses]);

  return { location, notification, locationCoords, requestAll, openSettings };
}
