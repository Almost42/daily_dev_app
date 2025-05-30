import type { ReactElement, ReactNode } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import type { Boot, BootApp, BootCacheData } from '../lib/boot';
import { getBootData } from '../lib/boot';
import { AuthContextProvider } from './AuthContext';
import type { AnonymousUser, LoggedUser } from '../lib/user';
import { AlertContextProvider } from './AlertContext';
import { generateQueryKey, RequestKey, STALE_TIME } from '../lib/query';
import {
  applyTheme,
  SettingsContextProvider,
  themeModes,
} from './SettingsContext';
import { storageWrapper as storage } from '../lib/storageWrapper';
import { useRefreshToken } from '../hooks/useRefreshToken';
import { NotificationsContextProvider } from './NotificationsContext';
import { BOOT_LOCAL_KEY, BOOT_QUERY_KEY } from './common';
import { GrowthBookProvider } from '../components/GrowthBookProvider';
import { useHostStatus } from '../hooks/useHostPermissionStatus';
import { checkIsExtension, isIOSNative } from '../lib/func';
import type { Feed, FeedList } from '../graphql/feed';
import { gqlClient } from '../graphql/common';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { LogContextProvider } from './LogContext';
import { REQUEST_APP_ACCOUNT_TOKEN_MUTATION } from '../graphql/users';

const ServerError = dynamic(
  () =>
    import(
      /* webpackChunkName: "serverError" */ '../components/errors/ServerError'
    ),
);

function filteredProps<T extends Record<string, unknown>>(
  obj: T,
  filteredKeys: (keyof T)[],
): Partial<T> {
  return filteredKeys.reduce((result, key) => {
    return { ...result, [key]: obj[key] };
  }, {});
}

export type BootDataProviderProps = {
  children?: ReactNode;
  app: BootApp;
  version: string;
  deviceId: string;
  localBootData?: BootCacheData;
  getPage: () => string;
  getRedirectUri: () => string;
};

export const getLocalBootData = (): BootCacheData | null => {
  const local = storage.getItem(BOOT_LOCAL_KEY);
  if (local) {
    return JSON.parse(storage.getItem(BOOT_LOCAL_KEY)) as BootCacheData;
  }

  return null;
};

const updateLocalBootData = (
  current: Partial<BootCacheData>,
  boot: Partial<BootCacheData>,
) => {
  const localData = { ...current, ...boot, lastModifier: 'extension' };
  const result = filteredProps(localData, [
    'alerts',
    'settings',
    'notifications',
    'user',
    'lastModifier',
    'squads',
    'exp',
    'feeds',
    'geo',
    'isAndroidApp',
  ]);

  storage.setItem(BOOT_LOCAL_KEY, JSON.stringify(result));

  return result;
};

const getCachedOrNull = () => {
  try {
    return JSON.parse(storage.getItem(BOOT_LOCAL_KEY));
  } catch (err) {
    return null;
  }
};

export type PreloadFeeds = ({
  feeds,
  user,
}: {
  feeds?: Feed[];
  user?: Pick<LoggedUser, 'id'>;
}) => void;

export const BootDataProvider = ({
  children,
  app,
  version,
  deviceId,
  localBootData,
  getRedirectUri,
  getPage,
}: BootDataProviderProps): ReactElement => {
  const queryClient = useQueryClient();
  const preloadFeedsRef = useRef<PreloadFeeds>();
  preloadFeedsRef.current = ({ feeds, user }) => {
    if (!feeds || !user) {
      return;
    }

    queryClient.setQueryData<FeedList['feedList']>(
      generateQueryKey(RequestKey.Feeds, user),
      {
        edges: feeds.map((item) => ({ node: item })),
        pageInfo: {
          hasNextPage: false,
        },
      },
    );
  };

  const [initialLoad, setInitialLoad] = useState<boolean>(null);
  const [cachedBootData, setCachedBootData] = useState<Partial<Boot>>();

  useEffect(() => {
    if (localBootData) {
      setCachedBootData(localBootData);

      return;
    }

    const boot = getLocalBootData();

    if (!boot) {
      setCachedBootData(null);

      return;
    }

    if (boot?.settings?.theme) {
      applyTheme(themeModes[boot.settings.theme]);
    }

    preloadFeedsRef.current({ feeds: boot.feeds, user: boot.user });

    setCachedBootData(boot);
  }, [localBootData]);

  const { hostGranted } = useHostStatus();
  const isExtension = checkIsExtension();
  const logged = cachedBootData?.user as LoggedUser;
  const shouldRefetch = !!logged?.providers && !!logged?.id;
  const lastAppliedChangeRef = useRef<Partial<BootCacheData>>();

  const {
    data: remoteData,
    error,
    refetch,
    isFetched,
    isError,
    dataUpdatedAt,
  } = useQuery<Partial<Boot>>({
    queryKey: BOOT_QUERY_KEY,
    queryFn: async () => {
      const result = await getBootData(app);
      preloadFeedsRef.current({ feeds: result.feeds, user: result.user });

      return result;
    },
    refetchOnWindowFocus: shouldRefetch,
    staleTime: STALE_TIME,
    enabled: !isExtension || !!hostGranted,
  });

  const isBootReady = isFetched && !isError;
  const loadedFromCache = !!cachedBootData;
  const { user, settings, alerts, notifications, squads, geo, isAndroidApp } =
    cachedBootData || {};

  useRefreshToken(remoteData?.accessToken, refetch);
  const updatedAtActive = user ? dataUpdatedAt : null;
  const updateBootData = useCallback(
    (updatedBootData: Partial<BootCacheData>, update = true) => {
      const cachedData = getCachedOrNull() || {};
      const lastAppliedChange = lastAppliedChangeRef.current;
      const params = new URLSearchParams(globalThis?.location?.search);
      let updatedData = {
        ...updatedBootData,
        isAndroidApp:
          cachedData?.isAndroidApp || Boolean(params.get('android')),
      };

      if (update) {
        if (lastAppliedChange) {
          updatedData = { ...lastAppliedChange, ...updatedData };
        }
        lastAppliedChangeRef.current = updatedData;
      } else {
        if (cachedData?.lastModifier !== 'companion' && lastAppliedChange) {
          updatedData = { ...updatedData, ...lastAppliedChange };
        }
        lastAppliedChangeRef.current = null;
      }

      const updated = updateLocalBootData(cachedData, updatedData);
      setCachedBootData(updated);
    },
    [],
  );

  const updateUser = useCallback(
    async (newUser: LoggedUser | AnonymousUser) => {
      updateBootData({ user: newUser });
      await queryClient.invalidateQueries({
        queryKey: generateQueryKey(RequestKey.Profile, newUser),
      });
    },
    [updateBootData, queryClient],
  );

  const updateSettings = useCallback(
    (updatedSettings) => updateBootData({ settings: updatedSettings }),
    [updateBootData],
  );

  const updateAlerts = useCallback(
    (updatedAlerts) => updateBootData({ alerts: updatedAlerts }),
    [updateBootData],
  );

  const updateExperimentation = useCallback(
    (exp: BootCacheData['exp']) => {
      updateLocalBootData(cachedBootData, { exp });
    },
    [cachedBootData],
  );
  if (logged?.language && logged?.isPlus) {
    gqlClient.setHeader('content-language', logged.language as string);
  } else {
    gqlClient.unsetHeader('content-language');
  }

  useEffect(() => {
    if (remoteData) {
      setInitialLoad(initialLoad === null);
      updateBootData(remoteData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteData]);

  useEffect(() => {
    if (
      isIOSNative() &&
      shouldRefetch &&
      !logged?.subscriptionFlags?.appAccountToken
    ) {
      gqlClient
        .request<{ requestAppAccountToken: string }>(
          REQUEST_APP_ACCOUNT_TOKEN_MUTATION,
        )
        .then((result) => {
          updateBootData({
            user: {
              ...logged,
              subscriptionFlags: {
                ...logged.subscriptionFlags,
                appAccountToken: result.requestAppAccountToken,
              },
            },
          });
        });
    }
  }, [logged, shouldRefetch, updateBootData]);

  if (error) {
    return (
      <div className="mx-2 flex h-screen items-center justify-center">
        <ServerError />
      </div>
    );
  }

  return (
    <GrowthBookProvider
      app={app}
      user={user}
      deviceId={deviceId}
      experimentation={cachedBootData?.exp}
      updateExperimentation={updateExperimentation}
    >
      <AuthContextProvider
        user={user}
        updateUser={updateUser}
        tokenRefreshed={updatedAtActive > 0}
        getRedirectUri={getRedirectUri}
        loadingUser={!dataUpdatedAt || !user}
        loadedUserFromCache={loadedFromCache}
        visit={remoteData?.visit}
        refetchBoot={refetch}
        isFetched={isBootReady}
        accessToken={remoteData?.accessToken}
        squads={squads}
        firstLoad={initialLoad}
        geo={geo}
        isAndroidApp={isAndroidApp}
      >
        <SettingsContextProvider
          settings={settings}
          loadedSettings={loadedFromCache}
          updateSettings={updateSettings}
        >
          <AlertContextProvider
            alerts={alerts}
            isFetched={isBootReady}
            updateAlerts={updateAlerts}
            loadedAlerts={loadedFromCache}
          >
            <LogContextProvider
              app={app}
              version={version}
              getPage={getPage}
              deviceId={deviceId}
            >
              <ErrorBoundary>
                <NotificationsContextProvider
                  isNotificationsReady={isBootReady}
                  unreadCount={notifications?.unreadNotificationsCount}
                >
                  {children}
                </NotificationsContextProvider>
              </ErrorBoundary>
            </LogContextProvider>
          </AlertContextProvider>
        </SettingsContextProvider>
      </AuthContextProvider>
    </GrowthBookProvider>
  );
};
