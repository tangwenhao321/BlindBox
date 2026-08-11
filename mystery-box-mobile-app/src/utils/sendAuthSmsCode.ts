import i18n from "../i18n";
import { toast } from "./toast";
import { getDevMockOtp } from "./devMockOtp";
import { sendAuthSms } from "../services/authService";
import { ApiClientError } from "../api";
import { normalizePhoneInput, validatePhone } from "./loginValidation";

export type SendAuthSmsResult = { ok: true; phone: string } | { ok: false };

/**
 * Request OTP for register / forgot-password / SMS login.
 * Returns ok=true only when send (or demo) succeeded — callers start cooldown only then.
 */
export async function sendAuthSmsCode(
  phone: string,
  options?: { onNormalized?: (phone: string) => void },
): Promise<SendAuthSmsResult> {
  const normalized = normalizePhoneInput(phone);
  options?.onNormalized?.(normalized);
  const phoneError = validatePhone(normalized);
  if (phoneError) {
    toast.error(phoneError);
    return { ok: false };
  }
  const mock = getDevMockOtp();
  if (mock) {
    toast.info(i18n.t("auth.demoCodeHint", { code: mock }));
    return { ok: true, phone: normalized };
  }
  try {
    await sendAuthSms(normalized);
    toast.success(i18n.t("auth.codeSent"));
    return { ok: true, phone: normalized };
  } catch (err) {
    const message = err instanceof ApiClientError ? err.message : String(err ?? "");
    if (/SMS_UNAVAILABLE/i.test(message)) {
      toast.info(i18n.t("auth.smsUnavailable"));
      return { ok: false };
    }
    if (/频繁|too many|rate|cooldown/i.test(message)) {
      toast.error(i18n.t("auth.smsTooFrequent"));
      return { ok: false };
    }
    toast.error(i18n.t("auth.smsSendFailed"));
    return { ok: false };
  }
}
