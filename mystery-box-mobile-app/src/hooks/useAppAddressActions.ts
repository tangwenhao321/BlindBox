import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { parseError } from "../api";
import i18n from "../i18n";
import { deleteAddresses, setDefaultAddress } from "../services/addressService";import { toast } from "../utils/toast";
import { mergeAddressForSave } from "./useAddressForm";
import type { Address } from "../types";
import type { AppView } from "../components/mainTabs/appViews";

type SaveAddressPayload = {
  id?: string;
  realName: string;
  phoneNumber: string;
  region?: string;
  district?: string;
  ward?: string;
  details: string;
  houseNumber: string;
  isFirstAddress: boolean;
};

type Params = {
  token: string;
  view: AppView;
  addresses: Address[];
  selectedAddressId: string;
  setSelectedAddressId: (id: string) => void;
  loadAddresses: (token: string) => Promise<void>;
  editingAddressId: string | null;
  setEditingAddressId: (id: string | null) => void;
  pendingCheckoutResume: boolean;
  setPendingCheckoutResume: (value: boolean) => void;
  formRealName: string;
  formPhoneNumber: string;
  formRegion: string;
  formDistrict: string;
  formWard: string;
  formDetails: string;
  formHouseNumber: string;
  formIsDefault: boolean;
  fillForm: (address?: Address, addressCount?: number) => void;
  setShowAddressModal: (visible: boolean) => void;
  goBack: () => void;
  navigate: (view: AppView) => void;
  saveAddressAction: (payload: SaveAddressPayload) => Promise<void>;
};

export function useAppAddressActions(params: Params) {
  const {
    token,
    view,
    addresses,
    selectedAddressId,
    setSelectedAddressId,
    loadAddresses,
    editingAddressId,
    setEditingAddressId,
    pendingCheckoutResume,
    setPendingCheckoutResume,
    formRealName,
    formPhoneNumber,
    formRegion,
    formDistrict,
    formWard,
    formDetails,
    formHouseNumber,
    formIsDefault,
    fillForm,
    setShowAddressModal,
    goBack,
    navigate,
    saveAddressAction,
  } = params;
  const { confirm } = useConfirmDialog();

  const fillAddressForm = (address?: Address) => fillForm(address, addresses.length);

  const openAddressForm = (address?: Address) => {
    fillAddressForm(address);
    setShowAddressModal(true);
  };

  const openAddressFormPage = (address?: Address, resumeCheckout = false) => {
    fillAddressForm(address);
    if (resumeCheckout) setPendingCheckoutResume(true);
    navigate("addressForm");
  };

  const onSetDefaultAddress = async (id: string) => {
    try {
      await setDefaultAddress(token, id);
      await loadAddresses(token);
      setSelectedAddressId(id);
      toast.success(i18n.t("addressActions.defaultSet"));
    } catch (error) {
      toast.error(parseError(error));
    }
  };

  const onDeleteAddress = async (id: string) => {
    const ok = await confirm({
      title: i18n.t("addressActions.deleteTitle"),
      message: i18n.t("addressActions.deleteMessage"),
      confirmLabel: i18n.t("addressActions.deleteConfirm"),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteAddresses(token, [id]);
      await loadAddresses(token);
      if (selectedAddressId === id) {
        setSelectedAddressId("");
      }
      toast.success(i18n.t("addressActions.deleted"));
    } catch (error) {
      toast.error(parseError(error));
    }
  };

  const saveAddress = async () => {
    const returnToManage = view === "addressForm" && !pendingCheckoutResume;
    await saveAddressAction({
      id: editingAddressId || undefined,
      realName: formRealName,
      phoneNumber: formPhoneNumber,
      region: formRegion,
      district: formDistrict,
      ward: formWard,
      details: formDetails,
      houseNumber: formHouseNumber,
      isFirstAddress: (addresses.length === 0 && !editingAddressId) || formIsDefault,
    });
    setEditingAddressId(null);
    if (pendingCheckoutResume) {
      goBack();
      return;
    }
    if (returnToManage) {
      goBack();
    }
  };

  return {
    openAddressForm,
    openAddressFormPage,
    onSetDefaultAddress,
    onDeleteAddress,
    saveAddress,
  };
}
