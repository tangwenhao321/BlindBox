import i18n from "../i18n";
import { toast } from "./toast";
import { getDevMockOtp } from "./devMockOtp";

/** Stub SMS sender until a real OTP API is wired. */
export async function sendAuthSmsCode(phone: string) {
  const trimmed = phone.trim();
  if (!trimmed) {
    toast.error(i18n.t("auth.phoneRequired"));
    return;
  }
  const mock = getDevMockOtp();
  if (mock) {
    toast.info(i18n.t("auth.demoCodeHint", { code: mock }));
  } else {
    toast.info(i18n.t("auth.codeSent"));
  }
}
