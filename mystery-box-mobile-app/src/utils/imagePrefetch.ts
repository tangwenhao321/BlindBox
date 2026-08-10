import { Image } from "expo-image";

export async function prefetchRevealImages(uris: Array<string | undefined | null>) {
  const unique = [...new Set(uris.map((u) => (u || "").trim()).filter(Boolean))];
  await Promise.all(
    unique.map((uri) =>
      Image.prefetch(uri, { cachePolicy: "memory-disk" }).catch(() => undefined),
    ),
  );
}
