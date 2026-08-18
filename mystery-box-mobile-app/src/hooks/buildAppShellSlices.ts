import type { AppModalsBuildInput } from "./buildAppModalsProps";
import type { LoginGateBuildInput } from "./buildAppLoginGateProps";
import type { AppAuthSession } from "./useAppAuthSession";
import type { useAppPaymentShell } from "./useAppPaymentShell";
import type { MysteryBox } from "../types";
import type { AppView } from "../components/mainTabs/appViews";

type PaymentShell = ReturnType<typeof useAppPaymentShell>;

export type AppShellAddressFormSlice = {
  showAddressModal: boolean;
  setShowAddressModal: (visible: boolean) => void;
  editingAddressId: string | null;
  formRealName: string;
  formPhoneNumber: string;
  formRegion: string;
  formDistrict: string;
  formWard: string;
  formDetails: string;
  formHouseNumber: string;
  savingAddress: boolean;
  setFormRealName: (v: string) => void;
  setFormPhoneNumber: (v: string) => void;
  setFormRegion: (v: string) => void;
  setFormDistrict: (v: string) => void;
  setFormWard: (v: string) => void;
  setFormDetails: (v: string) => void;
  setFormHouseNumber: (v: string) => void;
  resetForm: () => void;
  saveAddress: () => void | Promise<void>;
};

export type AppShellModalsParams = {
  token: string;
  newcomer: {
    visible: boolean;
    eligible?: boolean;
    dismiss: () => void;
    hide: () => void;
    open: () => void;
  };
  openDetailsPage: (id: string) => void | Promise<void>;
  paymentShell: PaymentShell;
  executeMockPayment: (orderId: string) => Promise<void>;
  requestPayment: (orderId: string, payAmount?: number) => Promise<void>;
  payWithPrepay: (orderId: string, prepay: import("../types").PrepayResult) => Promise<boolean>;
  onPaymentConfirmed: (orderId: string) => Promise<void>;
  address: AppShellAddressFormSlice;
  activeBox: MysteryBox | null;
  setActiveBox: (box: MysteryBox | null) => void;
  navigate: (view: AppView) => void;
  createOrder: (
    drawMode?: import("../services/orderService").DrawMode,
    slotNo?: number,
    boxOverride?: MysteryBox | null,
    drawCountOverride?: number,
  ) => void;
  openOrderDetailsPage: (orderId: string) => void | Promise<void>;
  setPendingCheckoutResume?: (value: boolean) => void;
};

export function buildAppShellModalsSlice(params: AppShellModalsParams): AppModalsBuildInput {
  const { token, newcomer, openDetailsPage, paymentShell, executeMockPayment, requestPayment, payWithPrepay, onPaymentConfirmed, address, activeBox, setActiveBox, navigate, createOrder, openOrderDetailsPage, setPendingCheckoutResume } =
    params;
  const {
    paymentSession,
    setPaymentSession,
    prepaySession,
    setPrepaySession,
    vnpaySession,
    setVnpaySession,
    momoSession,
    setMomoSession,
    paymentErrorSession,
    setPaymentErrorSession,
    orderResult,
    setOrderResult,
    sharePosterVisible,
    setSharePosterVisible,
  } = paymentShell;

  return {
    token,
    newcomerVisible: newcomer.visible,
    onNewcomerClose: () => void newcomer.dismiss(),
    onNewcomerBuy: (box: MysteryBox) => {
      newcomer.hide();
      setPendingCheckoutResume?.(true);
      void openDetailsPage(box.id);
    },
    paymentSession,
    setPaymentSession,
    executeMockPayment,
    prepaySession,
    setPrepaySession,
    vnpaySession,
    setVnpaySession,
    momoSession,
    setMomoSession,
    paymentErrorSession,
    setPaymentErrorSession,
    requestPayment,
    payWithPrepay,
    onPaymentConfirmed,
    showAddressModal: address.showAddressModal,
    setShowAddressModal: address.setShowAddressModal,
    editingAddressId: address.editingAddressId,
    formRealName: address.formRealName,
    formPhoneNumber: address.formPhoneNumber,
    formRegion: address.formRegion,
    formDistrict: address.formDistrict,
    formWard: address.formWard,
    formDetails: address.formDetails,
    formHouseNumber: address.formHouseNumber,
    savingAddress: address.savingAddress,
    setFormRealName: address.setFormRealName,
    setFormPhoneNumber: address.setFormPhoneNumber,
    setFormRegion: address.setFormRegion,
    setFormDistrict: address.setFormDistrict,
    setFormWard: address.setFormWard,
    setFormDetails: address.setFormDetails,
    setFormHouseNumber: address.setFormHouseNumber,
    resetForm: address.resetForm,
    saveAddress: address.saveAddress,
    orderResult,
    setOrderResult,
    activeBox,
    setActiveBox,
    navigate,
    createOrder,
    openOrderDetailsPage,
    sharePosterVisible,
    setSharePosterVisible,
  };
}

export function buildAppShellLoginSlice(
  authSession: AppAuthSession,
  apiBaseUrl: string,
  authHandlers: LoginGateBuildInput["authHandlers"],
): LoginGateBuildInput {
  return {
    apiBaseUrl,
    loginVisible: authSession.loginVisible,
    setLoginVisible: authSession.setLoginVisible,
    phone: authSession.phone,
    password: authSession.password,
    confirmPassword: authSession.confirmPassword,
    inviteCode: authSession.inviteCode,
    submitting: authSession.submitting,
    setPhone: authSession.setPhone,
    setPassword: authSession.setPassword,
    setConfirmPassword: authSession.setConfirmPassword,
    setInviteCode: authSession.setInviteCode,
    authHandlers,
    restoreToken: authSession.restoreToken,
  };
}
