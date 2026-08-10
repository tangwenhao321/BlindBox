import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { ReactNode } from "react";
import { queryClient } from "./queryClient";

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "mystery-box-query-cache",
  throttleTime: 2000,
});

const PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Query keys that must not be written to disk (balances, orders, addresses, notifications). */
const SENSITIVE_QUERY_ROOTS = new Set(["orders", "addresses", "notifications", "coupons"]);

function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  const root = queryKey[0];
  return typeof root !== "string" || !SENSITIVE_QUERY_ROOTS.has(root);
}

export function AppQueryPersistProvider({ children }: { children: ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: PERSIST_MAX_AGE_MS,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.state.status === "success" && shouldPersistQuery(query.queryKey),
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
