import { useEffect } from 'react';
import { Platform } from 'react-native';

import Constants from 'expo-constants';

import { supabase } from '@/src/online/supabase-client';

type UsePushRegistrationParams = {
  enabled: boolean;
  userId: string | null | undefined;
};

type NotificationPermissionStatus = 'undetermined' | 'denied' | 'granted';

type NotificationsModuleLike = {
  AndroidImportance: {
    MAX: number;
  };
  setNotificationHandler: (handler: {
    handleNotification: () => Promise<{
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
      shouldShowBanner: boolean;
      shouldShowList: boolean;
    }>;
  }) => void;
  setNotificationChannelAsync: (
    channelId: string,
    config: {
      name: string;
      importance: number;
      vibrationPattern: number[];
      lightColor: string;
    }
  ) => Promise<void>;
  getPermissionsAsync: () => Promise<{ status: NotificationPermissionStatus }>;
  requestPermissionsAsync: () => Promise<{ status: NotificationPermissionStatus }>;
  getExpoPushTokenAsync: (params: { projectId: string }) => Promise<{ data: string }>;
};

let notificationHandlerReady = false;

async function getNotificationsModule(): Promise<NotificationsModuleLike | null> {
  try {
    const moduleName = 'expo-notifications';
    const moduleValue = (await import(moduleName)) as Partial<NotificationsModuleLike> & {
      default?: NotificationsModuleLike;
    };
    return moduleValue.default ?? (moduleValue as NotificationsModuleLike);
  } catch {
    return null;
  }
}

export function usePushRegistration({ enabled, userId }: UsePushRegistrationParams) {
  useEffect(() => {
    if (!enabled || !userId) return;
    if (Platform.OS === 'web') return;

    let cancelled = false;

    const registerPushToken = async () => {
      try {
        const Notifications = await getNotificationsModule();
        if (!Notifications) {
          console.warn('[push] expo-notifications is not installed. Push registration skipped.');
          return;
        }

        if (!notificationHandlerReady) {
          Notifications.setNotificationHandler({
            handleNotification: async () => ({
              shouldPlaySound: true,
              shouldSetBadge: false,
              shouldShowBanner: true,
              shouldShowList: true,
            }),
          });
          notificationHandlerReady = true;
        }

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#D2A869',
          });
        }

        const permissionState = await Notifications.getPermissionsAsync();
        const permissionStatus =
          permissionState.status !== 'granted'
            ? (await Notifications.requestPermissionsAsync()).status
            : permissionState.status;
        if (permissionStatus !== 'granted') return;

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;
        if (!projectId) {
          console.warn('[push] Missing EAS projectId in app config. Push registration skipped.');
          return;
        }

        const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        if (!token || cancelled) return;

        const { error } = await supabase.rpc('set_push_subscription', {
          p_token: token,
          p_platform: Platform.OS,
        });
        if (error) {
          console.warn('[push] Failed to save push token:', error.message);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn('[push] Registration error:', message);
      }
    };

    void registerPushToken();

    return () => {
      cancelled = true;
    };
  }, [enabled, userId]);
}
