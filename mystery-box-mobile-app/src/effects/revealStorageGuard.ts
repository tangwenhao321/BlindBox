import * as FileSystem from "expo-file-system/legacy";

const DEFAULT_MIN_BYTES = 5 * 1024 * 1024;

export async function checkFreeStorage(minBytes = DEFAULT_MIN_BYTES): Promise<boolean> {
  try {
    const free = await FileSystem.getFreeDiskStorageAsync();
    return free >= minBytes;
  } catch {
    return true;
  }
}
