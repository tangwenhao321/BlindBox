import { describe, expect, it, vi } from "vitest";
import { assembleAppShellInput } from "./assembleAppShellInput";
import type { AppModalsBuildInput } from "./buildAppModalsProps";
import type { LoginGateBuildInput } from "./buildAppLoginGateProps";

function minimalModalsSlice(): AppModalsBuildInput {
  const noop = vi.fn();
  return {
    token: "tok",
    newcomerVisible: false,
    onNewcomerClose: noop,
    onNewcomerBuy: noop,
    paymentSession: { orderId: "o1", payAmount: 9.9 },
    setPaymentSession: noop,
    executeMockPayment: async () => undefined,
    prepaySession: null,
    setPrepaySession: noop,
    vnpaySession: null,
    setVnpaySession: noop,
    momoSession: null,
    setMomoSession: noop,
    paymentErrorSession: null,
    setPaymentErrorSession: noop,
    onPaymentConfirmed: async () => undefined,
    requestPayment: async () => undefined,
    payWithPrepay: async () => false,
    showAddressModal: false,
    setShowAddressModal: noop,
    editingAddressId: null,
    formRealName: "",
    formPhoneNumber: "",
    formRegion: "",
    formDetails: "",
    formHouseNumber: "",
    formDistrict: "",
    formWard: "",
    savingAddress: false,
    setFormRealName: noop,
    setFormPhoneNumber: noop,
    setFormRegion: noop,
    setFormDetails: noop,
    setFormHouseNumber: noop,
    setFormDistrict: noop,
    setFormWard: noop,
    resetForm: noop,
    saveAddress: noop,
    orderResult: null,
    setOrderResult: noop,
    activeBox: null,
    setActiveBox: noop,
    navigate: noop,
    createOrder: noop,
    openOrderDetailsPage: noop,
    sharePosterVisible: false,
    setSharePosterVisible: noop,
  };
}

function minimalLoginSlice(): LoginGateBuildInput {
  const noop = vi.fn();
  return {
    apiBaseUrl: "http://127.0.0.1:9912",
    loginVisible: true,
    setLoginVisible: noop,
    phone: "13800138000",
    password: "secret",
    confirmPassword: "",
    inviteCode: "",
    submitting: false,
    setPhone: noop,
    setPassword: noop,
    setConfirmPassword: noop,
    setInviteCode: noop,
    restoreToken: async () => null,
    authHandlers: {
      authError: null,
      clearAuthError: noop,
      forgotVisible: false,
      forgotPhone: "",
      forgotCode: "",
      forgotPassword: "",
      forgotSubmitting: false,
      setForgotPhone: noop,
      setForgotVisible: noop,
      setForgotCode: noop,
      registerCode: "",
      setRegisterCode: noop,
      setForgotPassword: noop,
      loginSmsCode: "",
      setLoginSmsCode: noop,
      termsAccepted: false,
      setTermsAccepted: noop,
      onLogin: noop,
      onSmsLogin: noop,
      onZaloLogin: noop,
      onRegister: noop,
      onForgotSubmit: noop,
    },
  };
}

describe("assembleAppShellInput", () => {
  it("merges modals and login slices", () => {
    const input = assembleAppShellInput(minimalModalsSlice(), minimalLoginSlice());
    expect(input.token).toBe("tok");
    expect(input.paymentSession?.orderId).toBe("o1");
    expect(input.loginVisible).toBe(true);
    expect(input.phone).toBe("13800138000");
    expect(input.apiBaseUrl).toBe("http://127.0.0.1:9912");
  });
});
