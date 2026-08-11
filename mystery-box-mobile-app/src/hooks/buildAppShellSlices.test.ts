import { describe, expect, it, vi } from "vitest";
import { buildAppShellLoginSlice, buildAppShellModalsSlice } from "./buildAppShellSlices";
import type { AppAuthSession } from "./useAppAuthSession";

describe("buildAppShellSlices", () => {
  it("buildAppShellModalsSlice wires newcomer and payment session", () => {
    const onNewcomerClose = vi.fn();
    const slice = buildAppShellModalsSlice({
      token: "t1",
      newcomer: { visible: true, dismiss: onNewcomerClose, hide: vi.fn(), open: vi.fn() },
      openDetailsPage: vi.fn(),
      paymentShell: {
        paymentSession: { orderId: "o1", payAmount: 10 },
        setPaymentSession: vi.fn(),
        prepaySession: null,
        setPrepaySession: vi.fn(),
        vnpaySession: null,
        setVnpaySession: vi.fn(),
        momoSession: null,
        setMomoSession: vi.fn(),
        paymentErrorSession: null,
        setPaymentErrorSession: vi.fn(),
        resetPaymentSessions: vi.fn(),
        orderResult: null,
        setOrderResult: vi.fn(),
        sharePosterVisible: false,
        setSharePosterVisible: vi.fn(),
        onOrderCreated: vi.fn(),
        onPaymentSuccess: vi.fn(),
        onCancelUnpaid: vi.fn(),
        markOrderResultPaid: vi.fn(),
      },
      executeMockPayment: vi.fn(),
      requestPayment: vi.fn(),
      payWithPrepay: vi.fn(),
      onPaymentConfirmed: vi.fn(),
      address: {
        showAddressModal: false,
        setShowAddressModal: vi.fn(),
        editingAddressId: null,
        formRealName: "",
        formPhoneNumber: "",
        formRegion: "",
        formDetails: "",
        formHouseNumber: "",
        formDistrict: "",
        formWard: "",
        savingAddress: false,
        setFormRealName: vi.fn(),
        setFormPhoneNumber: vi.fn(),
        setFormRegion: vi.fn(),
        setFormDetails: vi.fn(),
        setFormHouseNumber: vi.fn(),
        setFormDistrict: vi.fn(),
        setFormWard: vi.fn(),
        resetForm: vi.fn(),
        saveAddress: vi.fn(),
      },
      activeBox: null,
      setActiveBox: vi.fn(),
      navigate: vi.fn(),
      createOrder: vi.fn(),
      openOrderDetailsPage: vi.fn(),
    });

    expect(slice.token).toBe("t1");
    expect(slice.newcomerVisible).toBe(true);
    expect(slice.paymentSession?.orderId).toBe("o1");
    slice.onNewcomerClose();
    expect(onNewcomerClose).toHaveBeenCalled();
  });

  it("buildAppShellLoginSlice maps auth session fields", () => {
    const authHandlers = {
      authError: null,
      clearAuthError: vi.fn(),
      forgotVisible: false,
      forgotPhone: "",
      forgotCode: "",
      forgotPassword: "",
      forgotSubmitting: false,
      setForgotPhone: vi.fn(),
      setForgotVisible: vi.fn(),
      setForgotCode: vi.fn(),
      registerCode: "",
      setRegisterCode: vi.fn(),
      setForgotPassword: vi.fn(),
      loginSmsCode: "",
      setLoginSmsCode: vi.fn(),
      termsAccepted: false,
      setTermsAccepted: vi.fn(),
      onLogin: vi.fn(),
      onSmsLogin: vi.fn(),
      onZaloLogin: vi.fn(),
      onRegister: vi.fn(),
      onForgotSubmit: vi.fn(),
    };
    const session = {
      token: "tok",
      loginVisible: true,
      setLoginVisible: vi.fn(),
      phone: "13800138000",
      password: "pwd",
      confirmPassword: "",
      inviteCode: "",
      submitting: false,
      setPhone: vi.fn(),
      setPassword: vi.fn(),
      setConfirmPassword: vi.fn(),
      setInviteCode: vi.fn(),
      restoreToken: vi.fn(),
      login: vi.fn(),
      loginWithZalo: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      openLoginPage: vi.fn(),
      requireAuth: () => true,
    } satisfies AppAuthSession;

    const slice = buildAppShellLoginSlice(session, "http://127.0.0.1:9912", authHandlers);
    expect(slice.apiBaseUrl).toBe("http://127.0.0.1:9912");
    expect(slice.phone).toBe("13800138000");
    expect(slice.authHandlers).toBe(authHandlers);
  });
});
