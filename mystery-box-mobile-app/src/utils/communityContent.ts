const IMAGE_URL_RE = /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i;

export function splitCommunityContent(content: string): { text: string; images: string[] } {
  const lines = content.split("\n");
  const images: string[] = [];
  const textLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (IMAGE_URL_RE.test(trimmed)) {
      images.push(trimmed);
    } else if (trimmed) {
      textLines.push(line);
    }
  }
  return { text: textLines.join("\n").trim(), images };
}

export function appendImageUrlsToContent(content: string, urls: string[]): string {
  if (!urls.length) return content;
  const suffix = urls.join("\n");
  return content.trim() ? `${content.trim()}\n${suffix}` : suffix;
}
