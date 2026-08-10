import { vi } from "vitest";

import "./src/i18n";

vi.mock("@react-native-community/netinfo", () => ({
  default: {
    addEventListener: () => () => undefined,
    fetch: async () => ({ isConnected: true, isInternetReachable: true }),
  },
}));

vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "zh-CN" }],
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => undefined),
    removeItem: vi.fn(async () => undefined),
  },
}));

vi.mock("expo-router", () => ({
  router: { push: vi.fn(), replace: vi.fn(), back: vi.fn() },
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/",
  useLocalSearchParams: () => ({}),
  Stack: "Stack",
  Slot: "Slot",
  Tabs: "Tabs",
  Redirect: "Redirect",
}));
