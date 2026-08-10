import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "catalog_search_history_v1";
const MAX_ITEMS = 10;

export async function loadSearchHistory(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  } catch {
    return [];
  }
}

export async function addSearchHistory(keyword: string): Promise<string[]> {
  const q = keyword.trim();
  if (!q) return loadSearchHistory();
  const prev = await loadSearchHistory();
  const next = [q, ...prev.filter((item) => item !== q)].slice(0, MAX_ITEMS);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function clearSearchHistory(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
