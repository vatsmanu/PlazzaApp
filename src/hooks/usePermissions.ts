import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';

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

export function usePermissions(): PermissionsState {
  const [location, setLocation] = useState<PermStatus>('undetermined');
  const [notification, setNotification] = useState<PermStatus>('undetermined');
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);

  const fetchCoords = useCallback(async () => {
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
      setLocationCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      // location granted but coords unavailable (emulator etc.)
    }
  }, []);

  const checkStatuses = useCallback(async () => {
    try {
      const locPerm = await Location.getForegroundPermissionsAsync();
      setLocation(toStatus(locPerm.granted, locPerm.canAskAgain));
      if (locPerm.granted) fetchCoords();
    } catch {
      setLocation('denied');
    }

    try {
      const notifPerm = await Notifications.getPermissionsAsync();
      setNotification(toStatus(notifPerm.granted, notifPerm.canAskAgain));
    } catch {
      setNotification('denied');
    }
  }, [fetchCoords]);

  const requestAll = useCallback(async () => {
    try {
      const locResult = await Location.requestForegroundPermissionsAsync();
      setLocation(toStatus(locResult.granted, locResult.canAskAgain));
      if (locResult.granted) fetchCoords();
    } catch {
      setLocation('denied');
    }

    try {
      const notifResult = await Notifications.requestPermissionsAsync();
      setNotification(toStatus(notifResult.granted, notifResult.canAskAgain));
    } catch {
      setNotification('denied');
    }
  }, [fetchCoords]);

  const openSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  // Check on mount and whenever app returns to foreground
  useEffect(() => {
    checkStatuses();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkStatuses();
    });
    return () => sub.remove();
  }, [checkStatuses]);

  return { location, notification, locationCoords, requestAll, openSettings };
}
