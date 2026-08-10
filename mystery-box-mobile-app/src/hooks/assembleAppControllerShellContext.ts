import type { AppShellModalsParams } from "./buildAppShellSlices";
import type { useAppPaymentShell } from "./useAppPaymentShell";
import type { MysteryBox } from "../types";
import type { AppView } from "../components/mainTabs/appViews";

type PaymentShell = ReturnType<typeof useAppPaymentShell>;

export type AssembleAppControllerShellInput = {
  token: string;
  newcomer: AppShellModalsParams["newcomer"];
  openDetailsPage: AppShellModalsParams["openDetailsPage"];
  paymentShell: PaymentShell;
  executeMockPayment: AppShellModalsParams["executeMockPayment"];
  requestPayment: AppShellModalsParams["requestPayment"];
  payWithPrepay: AppShellModalsParams["payWithPrepay"];
  onPaymentConfirmed: (orderId: string) => Promise<void>;
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
  activeBox: MysteryBox | null;
  setActiveBox: (box: MysteryBox | null) => void;
  navigate: (view: AppView) => void;
  createOrder: AppShellModalsParams["createOrder"];
  openOrderDetailsPage: (orderId: string) => void | Promise<void>;
};

export function assembleAppControllerShellContext(input: AssembleAppControllerShellInput): AppShellModalsParams {
  const {
    token,
    newcomer,
    openDetailsPage,
    paymentShell,
    executeMockPayment,
    requestPayment,
    payWithPrepay,
    onPaymentConfirmed,
    showAddressModal,
    setShowAddressModal,
    editingAddressId,
    formRealName,
    formPhoneNumber,
    formRegion,
    formDistrict,
    formWard,
    formDetails,
    formHouseNumber,
    savingAddress,
    setFormRealName,
    setFormPhoneNumber,
    setFormRegion,
    setFormDistrict,
    setFormWard,
    setFormDetails,
    setFormHouseNumber,
    resetForm,
    saveAddress,
    activeBox,
    setActiveBox,
    navigate,
    createOrder,
    openOrderDetailsPage,
  } = input;

  return {
    token,
    newcomer,
    openDetailsPage,
    paymentShell,
    executeMockPayment,
    requestPayment,
    payWithPrepay,
    onPaymentConfirmed,
    address: {
      showAddressModal,
      setShowAddressModal,
      editingAddressId,
      formRealName,
      formPhoneNumber,
      formRegion,
      formDistrict,
      formWard,
      formDetails,
      formHouseNumber,
      savingAddress,
      setFormRealName,
      setFormPhoneNumber,
      setFormRegion,
      setFormDistrict,
      setFormWard,
      setFormDetails,
      setFormHouseNumber,
      resetForm,
      saveAddress,
    },
    activeBox,
    setActiveBox,
    navigate,
    createOrder,
    openOrderDetailsPage,
  };
}
