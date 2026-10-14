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
      // Try last known position first — instant, no GPS spin-up needed
      const last = await Location.getLastKnownPositionAsync({});
      if (last) {
        setLocationCoords({ lat: last.coords.latitude, lng: last.coords.longitude });
        return;
      }
      // Fall back to a fresh fix with a 10 s timeout
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
      });
      setLocationCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      // coords unavailable — banner simply won't show the delivery line
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
