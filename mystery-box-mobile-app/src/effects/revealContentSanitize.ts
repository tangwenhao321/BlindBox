const LOCAL_BLOCKLIST = ["spam", "test123", "xxx"];

export function sanitizeRevealText(input: string, maxLen = 48): string {
  let text = (input ?? "").trim();
  if (!text) return "";
  for (const word of LOCAL_BLOCKLIST) {
    const re = new RegExp(word, "gi");
    text = text.replace(re, "•");
  }
  const chars = Array.from(text);
  if (chars.length <= maxLen) return text;
  return chars.slice(0, maxLen - 1).join("") + "…";
}

export function mergeRevealBlocklist(remote: string[] = []): string[] {
  return [...new Set([...LOCAL_BLOCKLIST, ...remote.map((w) => w.toLowerCase())])];
}
