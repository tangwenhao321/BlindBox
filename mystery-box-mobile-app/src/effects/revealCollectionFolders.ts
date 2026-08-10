import AsyncStorage from "@react-native-async-storage/async-storage";
import { revealStorageKey } from "../utils/revealStorageNamespace";

const KEY = "collection_folders";

export type RevealCollectionFolder = {
  id: string;
  name: string;
  productIds: string[];
  createdAt: number;
};

async function loadAll(): Promise<RevealCollectionFolder[]> {
  try {
    const raw = await AsyncStorage.getItem(revealStorageKey(KEY));
    if (!raw) return [];
    return JSON.parse(raw) as RevealCollectionFolder[];
  } catch {
    return [];
  }
}

async function saveAll(folders: RevealCollectionFolder[]): Promise<void> {
  await AsyncStorage.setItem(revealStorageKey(KEY), JSON.stringify(folders));
}

export async function listRevealCollectionFolders(): Promise<RevealCollectionFolder[]> {
  return loadAll();
}

export async function createRevealCollectionFolder(name: string): Promise<RevealCollectionFolder> {
  const folders = await loadAll();
  const folder: RevealCollectionFolder = {
    id: `f_${Date.now().toString(36)}`,
    name: name.trim(),
    productIds: [],
    createdAt: Date.now(),
  };
  folders.unshift(folder);
  await saveAll(folders);
  return folder;
}

export async function updateRevealCollectionFolder(
  id: string,
  patch: Partial<Pick<RevealCollectionFolder, "name" | "productIds">>,
): Promise<RevealCollectionFolder | null> {
  const folders = await loadAll();
  const idx = folders.findIndex((f) => f.id === id);
  if (idx < 0) return null;
  folders[idx] = { ...folders[idx], ...patch };
  await saveAll(folders);
  return folders[idx];
}

export async function deleteRevealCollectionFolder(id: string): Promise<boolean> {
  const folders = await loadAll();
  const next = folders.filter((f) => f.id !== id);
  if (next.length === folders.length) return false;
  await saveAll(next);
  return true;
}
