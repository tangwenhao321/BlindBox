import * as Linking from "expo-linking";
import { fetchZaloAuthConfig } from "../services/authService";

const REDIRECT_PATH = "auth/zalo";
const AUTH_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

export function getZaloRedirectUri() {
  return Linking.createURL(REDIRECT_PATH);
}

function randomVerifier(length = 64) {
  const bytes = new Uint8Array(length);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += AUTH_CHARS[bytes[i]! % AUTH_CHARS.length];
  }
  return out;
}

function base64UrlFromArrayBuffer(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const b64 =
    typeof globalThis.btoa === "function"
      ? globalThis.btoa(binary)
      : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256Base64Url(input: string) {
  const data = new TextEncoder().encode(input);
  if (typeof globalThis.crypto?.subtle?.digest !== "function") {
    throw new Error("ZALO_PKCE_UNAVAILABLE: SHA-256 (Web Crypto) is required for Zalo login");
  }
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return base64UrlFromArrayBuffer(digest);
}

function extractCode(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const normalized = url.replace(/^mysterybox:/i, "https://mysterybox.local");
    const parsed = new URL(normalized);
    return parsed.searchParams.get("code");
  } catch {
    const match = /[?&#]code=([^&#]+)/i.exec(url);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }
}

export type ZaloAuthSessionResult =
  | { status: "success"; code: string; codeVerifier: string }
  | { status: "cancelled" }
  | { status: "paste_required"; codeVerifier: string; authUrl: string }
  | { status: "error"; message: string };

async function buildAuthUrl(appIdOverride?: string): Promise<
  | { appId: string; codeVerifier: string; redirectUri: string; authUrl: string }
  | { error: string }
> {
  const remote = await fetchZaloAuthConfig().catch(() => null);
  const appId =
    appIdOverride?.trim() ||
    remote?.appId?.trim() ||
    process.env.EXPO_PUBLIC_ZALO_APP_ID?.trim() ||
    "";
  if (!appId) {
    return { error: "missing_app_id" };
  }
  const codeVerifier = randomVerifier(64);
  const codeChallenge = await sha256Base64Url(codeVerifier);
  const redirectUri = getZaloRedirectUri();
  const authBase = remote?.authorizationUrl?.trim() || "https://oauth.zaloapp.com/v4/permission";
  const authUrl =
    `${authBase}?app_id=${encodeURIComponent(appId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&code_challenge=${encodeURIComponent(codeChallenge)}` +
    `&code_challenge_method=S256`;
  return { appId, codeVerifier, redirectUri, authUrl };
}

/**
 * Opens Zalo OAuth (PKCE) via expo-web-browser when available.
 * Falls back to opening the system browser and requiring a pasted code (Expo Go).
 */
export async function startZaloAuthSession(appIdOverride?: string): Promise<ZaloAuthSessionResult> {
  const built = await buildAuthUrl(appIdOverride);
  if ("error" in built) {
    return { status: "error", message: built.error };
  }
  const { authUrl, codeVerifier, redirectUri } = built;

  try {
    // Optional — installed with expo-web-browser; works in Expo Go.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const WebBrowser = require("expo-web-browser") as typeof import("expo-web-browser");
    WebBrowser.maybeCompleteAuthSession?.();
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
    if (result.type === "success") {
      const code = extractCode(result.url);
      if (!code) return { status: "error", message: "missing_code" };
      return { status: "success", code, codeVerifier };
    }
    if (result.type === "dismiss" || result.type === "cancel") {
      return { status: "cancelled" };
    }
    return { status: "error", message: String(result.type) };
  } catch {
    await Linking.openURL(authUrl);
    return { status: "paste_required", codeVerifier, authUrl };
  }
}
