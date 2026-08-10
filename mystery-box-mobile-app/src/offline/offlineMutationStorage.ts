import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PersistedOfflineMutation } from "./offlineMutationTypes";

const STORAGE_KEY = "mystery-box-offline-mutations";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function pruneExpired(items: PersistedOfflineMutation[]): PersistedOfflineMutation[] {
  const cutoff = Date.now() - MAX_AGE_MS;
  return items.filter((item) => item.createdAt >= cutoff);
}

export async function loadPersistedMutations(): Promise<PersistedOfflineMutation[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersistedOfflineMutation[];
    if (!Array.isArray(parsed)) return [];
    const pruned = pruneExpired(parsed);
    if (pruned.length !== parsed.length) {
      await savePersistedMutations(pruned);
    }
    return pruned;
  } catch {
    return [];
  }
}

export async function savePersistedMutations(items: PersistedOfflineMutation[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function appendPersistedMutation(item: PersistedOfflineMutation): Promise<void> {
  const items = await loadPersistedMutations();
  items.push(item);
  await savePersistedMutations(items);
}

export async function removePersistedMutation(id: string): Promise<void> {
  const items = await loadPersistedMutations();
  const next = items.filter((item) => item.id !== id);
  if (next.length !== items.length) {
    await savePersistedMutations(next);
  }
}

export async function clearPersistedMutations(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
