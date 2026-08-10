declare module "expo-media-library" {
  export function requestPermissionsAsync(): Promise<{ granted: boolean }>;
  export function createAssetAsync(localUri: string): Promise<{ uri: string }>;
  export function createAlbumAsync(
    name: string,
    asset?: { uri: string },
    initialAssetLocalUri?: boolean,
  ): Promise<string>;
}
