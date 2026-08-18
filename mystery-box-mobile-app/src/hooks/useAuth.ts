import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { useEffect, useState } from "react";
import {
  loginByPhone,
  loginBySms as loginBySmsApi,
  loginByZalo,
  registerByPhone,
  type ZaloLoginPayload,
} from "../services/authService";
import { resolveSmsCode } from "../utils/devMockOtp";
import { clearSessionAuthToken, setSessionAuthToken } from "../utils/authTokenStore";
import { initRevealStorageNamespace } from "../utils/revealStorageNamespace";
import { clearRevealSessionForUser } from "../effects/revealOrchestrator";
import { loadEquippedThemeId, loadThemeUnlockState } from "../effects/revealThemeRotation";
import { normalizePhoneInput } from "../utils/loginValidation";
import { readLastLoginPhone, writeLastLoginPhone } from "../utils/lastLoginPhone";

const TOKEN_KEY = "token";
const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const isWeb = Platform.OS === "web";

async function migrateLegacyToken(): Promise<string | null> {
  if (isWeb) {
    return AsyncStorage.getItem(TOKEN_KEY);
  }
  try {
    const legacy = await AsyncStorage.getItem(TOKEN_KEY);
    if (!legacy) return null;
    await SecureStore.setItemAsync(TOKEN_KEY, legacy, SECURE_OPTIONS);
    await AsyncStorage.removeItem(TOKEN_KEY);
    return legacy;
  } catch {
    return AsyncStorage.getItem(TOKEN_KEY);
  }
}

async function readToken(): Promise<string | null> {
  if (isWeb) {
    return AsyncStorage.getItem(TOKEN_KEY);
  }
  try {
    const secure = await SecureStore.getItemAsync(TOKEN_KEY);
    if (secure) return secure;
  } catch {
    // SecureStore may be unavailable on some simulators.
  }
  return migrateLegacyToken();
}

async function writeToken(value: string) {
  setSessionAuthToken(value);
  if (isWeb) {
    await AsyncStorage.setItem(TOKEN_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, value, SECURE_OPTIONS);
  await AsyncStorage.removeItem(TOKEN_KEY);
}

async function clearToken() {
  clearSessionAuthToken();
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // Ignore secure-store cleanup failures.
  }
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function hasStoredAuthToken(): Promise<boolean> {
  const saved = await readToken();
  return Boolean(saved);
}

async function persistSession(nextToken: string, phoneForMemory?: string) {
  if (phoneForMemory) {
    await writeLastLoginPhone(phoneForMemory);
  }
  await writeToken(nextToken);
  await initRevealStorageNamespace(nextToken.slice(0, 16));
  void loadThemeUnlockState();
  void loadEquippedThemeId();
}

export function useAuth() {
  const [token, setToken] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void readLastLoginPhone().then((saved) => {
      if (!cancelled && saved) setPhone((current) => current || saved);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const restoreToken = async () => {
    const savedToken = await readToken();
    if (savedToken) {
      setToken(savedToken);
      setSessionAuthToken(savedToken);
      await initRevealStorageNamespace(savedToken.slice(0, 16));
      void loadThemeUnlockState();
      void loadEquippedThemeId();
    }
    return savedToken;
  };

  const login = async () => {
    setSubmitting(true);
    try {
      const normalizedPhone = normalizePhoneInput(phone);
      if (normalizedPhone !== phone) setPhone(normalizedPhone);
      const nextToken = await loginByPhone(normalizedPhone, password);
      setToken(nextToken);
      await persistSession(nextToken, normalizedPhone);
      return nextToken;
    } finally {
      setSubmitting(false);
    }
  };

  const loginWithSms = async (smsCode: string) => {
    setSubmitting(true);
    try {
      const normalizedPhone = normalizePhoneInput(phone);
      if (normalizedPhone !== phone) setPhone(normalizedPhone);
      const code = resolveSmsCode(smsCode);
      const nextToken = await loginBySmsApi(normalizedPhone, code);
      setToken(nextToken);
      await persistSession(nextToken, normalizedPhone);
      return nextToken;
    } finally {
      setSubmitting(false);
    }
  };

  const loginWithZalo = async (payload: ZaloLoginPayload) => {
    setSubmitting(true);
    try {
      const nextToken = await loginByZalo(payload);
      setToken(nextToken);
      await persistSession(nextToken, phone ? normalizePhoneInput(phone) : undefined);
      return nextToken;
    } finally {
      setSubmitting(false);
    }
  };

  const register = async (inviteCode?: string, smsCode?: string) => {
    setSubmitting(true);
    try {
      const code = resolveSmsCode(smsCode);
      const normalizedPhone = normalizePhoneInput(phone);
      if (normalizedPhone !== phone) setPhone(normalizedPhone);
      const nextToken = await registerByPhone(normalizedPhone, password, code, inviteCode);
      setToken(nextToken);
      await persistSession(nextToken, normalizedPhone);
      return nextToken;
    } finally {
      setSubmitting(false);
    }
  };

  const logout = async () => {
    setToken("");
    const { clearOfflineMutationQueue } = await import("../offline/offlineMutationQueue");
    clearOfflineMutationQueue();
    await clearRevealSessionForUser();
    await initRevealStorageNamespace(null);
    await clearToken();
  };

  return {
    token,
    phone,
    password,
    submitting,
    setPhone,
    setPassword,
    setToken,
    restoreToken,
    login,
    loginWithSms,
    loginWithZalo,
    register,
    logout,
  };
}
