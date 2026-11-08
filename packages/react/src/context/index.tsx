import React, { createContext, useContext, useMemo, type ReactNode } from "react";
import type { InstagramReactConfig } from "../types/index.js";

const DEFAULT_API_BASE_PATH = "/api/instagram";

async function defaultFetcher<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {})
    }
  });

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const errPayload = data as { error?: { message?: string }; message?: string } | null;
    const message =
      errPayload?.error?.message ??
      errPayload?.message ??
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

const InstagramContext = createContext<Required<Omit<InstagramReactConfig, "accountId">> & {
  accountId?: string;
}>({
  apiBasePath: DEFAULT_API_BASE_PATH,
  fetcher: defaultFetcher
});

export interface InstagramProviderProps extends InstagramReactConfig {
  children: ReactNode;
}

/**
 * Optional provider to configure base API route paths, account IDs, or custom fetchers
 * across all InstaConnect hooks and components.
 */
export function InstagramProvider({
  apiBasePath = DEFAULT_API_BASE_PATH,
  fetcher = defaultFetcher,
  accountId,
  children
}: InstagramProviderProps): React.JSX.Element {
  const value = useMemo(
    () => ({
      apiBasePath,
      fetcher,
      ...(accountId ? { accountId } : {})
    }),
    [apiBasePath, fetcher, accountId]
  );

  return <InstagramContext.Provider value={value}>{children}</InstagramContext.Provider>;
}

export function useInstagramConfig() {
  return useContext(InstagramContext);
}

