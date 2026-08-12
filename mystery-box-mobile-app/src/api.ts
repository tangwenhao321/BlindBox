import axios, { type AxiosResponse } from "axios";
import type { ApiResult } from "./types";
import i18n from "./i18n";
import { parseError } from "./utils/apiErrorMessage";
import { AUTH_ERROR_CODES } from "./utils/apiErrorCodes";
import { isPublicAuthApiPath } from "./utils/apiAuth";
import { setOffline } from "./utils/connectivity";
import { clientPlatformHeaders } from "./utils/clientAttestation";

const envApiBaseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL || "").trim();
export const API_BASE_URL =
  envApiBaseUrl ||
  (__DEV__ ? "http://127.0.0.1:9912" : "");

if (!API_BASE_URL) {
  console.warn(
    "[mystery-box] EXPO_PUBLIC_API_BASE_URL is not set. Configure it in .env before running the app.",
  );
}

export { AUTH_ERROR_CODES } from "./utils/apiErrorCodes";

export class ApiClientError extends Error {
  code: number;
  traceId?: string;
  /** Stable SCREAMING_SNAKE from backend JSON `errorCode` when present. */
  errorCode?: string;

  constructor(message: string, code = -1, traceId?: string, errorCode?: string) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.traceId = traceId;
    this.errorCode = errorCode;
  }
}

let onUnauthorized: (() => void) | null = null;
let unauthorizedFired = false;

export function setOnUnauthorized(handler: (() => void) | null) {
  onUnauthorized = handler;
  unauthorizedFired = false;
}

function triggerUnauthorized() {
  if (unauthorizedFired || !onUnauthorized) return;
  unauthorizedFired = true;
  onUnauthorized();
}

export { isPublicAuthApiPath } from "./utils/apiAuth";

function shouldTriggerUnauthorized(url: string | undefined, code: number, status?: number) {
  if (isPublicAuthApiPath(url)) return false;
  return AUTH_ERROR_CODES.has(code) || status === 401;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    ...clientPlatformHeaders(),
  },
});

const RETRYABLE_METHODS = new Set(["get", "head"]);
const MAX_RETRIES = 2;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type RetryConfig = { __retryCount?: number };

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error) || !error.config) {
      return Promise.reject(error);
    }
    const config = error.config as typeof error.config & RetryConfig;
    const method = (config.method || "get").toLowerCase();
    const retryCount = config.__retryCount ?? 0;
    const shouldRetry =
      retryCount < MAX_RETRIES &&
      RETRYABLE_METHODS.has(method) &&
      (!error.response || error.response.status >= 500 || error.code === "ECONNABORTED");
    if (!shouldRetry) {
      return Promise.reject(error);
    }
    config.__retryCount = retryCount + 1;
    await sleep(400 * (retryCount + 1));
    return api(config);
  },
);

function resolveTraceId(res: AxiosResponse): string | undefined {
  const payload = res.data as ApiResult<unknown> | undefined;
  const headerTrace = res.headers?.["x-trace-id"] ?? res.headers?.["X-Trace-Id"];
  if (typeof headerTrace === "string" && headerTrace.trim()) {
    return headerTrace.trim();
  }
  return payload?.traceId;
}

api.interceptors.response.use(
  (response) => {
    const payload = response.data as ApiResult<unknown> | undefined;
    if (payload && typeof payload.code === "number" && payload.code !== 1) {
      const traceId = resolveTraceId(response);
      if (shouldTriggerUnauthorized(response.config?.url, payload.code, response.status)) {
        triggerUnauthorized();
      }
      return Promise.reject(
        new ApiClientError(
          payload.msg || i18n.t("api.requestFailed"),
          payload.code,
          traceId,
          typeof payload.errorCode === "string" ? payload.errorCode : undefined,
        ),
      );
    }
    return response;
  },
  (error) => {
    if (!axios.isAxiosError(error)) {
      if (error instanceof Error && error.message) {
        return Promise.reject(error);
      }
      return Promise.reject(new ApiClientError(i18n.t("api.requestRetry")));
    }
    const payload = error.response?.data as (ApiResult<unknown> & { message?: string }) | undefined;
    const traceId =
      (typeof error.response?.headers?.["x-trace-id"] === "string"
        ? error.response.headers["x-trace-id"]
        : undefined) || payload?.traceId;
    const rawMessage = payload?.msg || payload?.message;
    if (!error.response) {
      setOffline(true);
      const hint = API_BASE_URL
        ? i18n.t("api.cannotConnect", { url: API_BASE_URL })
        : i18n.t("api.apiNotConfigured");
      return Promise.reject(new ApiClientError(hint, -1, traceId));
    }
    setOffline(false);
    const message = rawMessage || error.message || i18n.t("api.requestRetry");
    const code = payload?.code ?? error.response?.status ?? -1;
    const errorCode = typeof payload?.errorCode === "string" ? payload.errorCode : undefined;
    if (
      shouldTriggerUnauthorized(error.config?.url, code, error.response?.status)
    ) {
      triggerUnauthorized();
    }
    return Promise.reject(new ApiClientError(message, code, traceId, errorCode));
  },
);

export { parseError, toAppError } from "./utils/apiErrorMessage";

export const buildAuthHeaders = (token: string, extra?: Record<string, string>) => ({
  token,
  ...clientPlatformHeaders(),
  ...extra,
});
