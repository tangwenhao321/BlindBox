import { useState } from "react";
import type { Address } from "../types";
import { CHINA_REGION_OPTIONS } from "../data/chinaRegions";
import { getVietnamRegionOptions } from "../data/vietnamRegions";
import { getAppLocale } from "../utils/i18nLocale";

export const VI_ADDRESS_SEP = " · ";

function splitChinaAddressDetails(details: string) {
  const trimmed = details.trim();
  const options = CHINA_REGION_OPTIONS;
  const match = options.find((region) => trimmed.startsWith(region));
  if (match) {
    return { region: match, street: trimmed.slice(match.length).trim() };
  }
  return { region: "", street: trimmed };
}

function splitVietnamAddressDetails(details: string) {
  const trimmed = details.trim();
  const options = getVietnamRegionOptions();
  let region = "";
  let rest = trimmed;
  const match = options.find((item) => trimmed.startsWith(item));
  if (match) {
    region = match;
    rest = trimmed.slice(match.length).replace(/^[ ·,]+/, "").trim();
  }
  const segments = rest.split(VI_ADDRESS_SEP).map((part) => part.trim()).filter(Boolean);
  if (segments.length >= 3) {
    return {
      region,
      district: segments[0],
      ward: segments[1],
      street: segments.slice(2).join(VI_ADDRESS_SEP),
    };
  }
  if (segments.length === 2) {
    return { region, district: segments[0], ward: "", street: segments[1] };
  }
  return { region, district: "", ward: "", street: rest };
}

function splitAddressDetails(details: string) {
  if (getAppLocale() === "vi-VN") {
    const { region, district, ward, street } = splitVietnamAddressDetails(details);
    return { region, district, ward, street };
  }
  const { region, street } = splitChinaAddressDetails(details);
  return { region, district: "", ward: "", street };
}

export function mergeAddressDetails(region: string, street: string) {
  const r = region.trim();
  const s = street.trim();
  if (!r) return s;
  if (!s) return r;
  return `${r} ${s}`;
}

function mergeVietnamAddressDetails(region: string, district: string, ward: string, street: string) {
  const parts = [region, district, ward, street].map((part) => part.trim()).filter(Boolean);
  return parts.join(VI_ADDRESS_SEP);
}

export function mergeAddressForSave(payload: {
  region?: string;
  district?: string;
  ward?: string;
  details: string;
}) {
  if (getAppLocale() === "vi-VN") {
    return mergeVietnamAddressDetails(
      payload.region ?? "",
      payload.district ?? "",
      payload.ward ?? "",
      payload.details,
    );
  }
  return mergeAddressDetails(payload.region ?? "", payload.details);
}

export function useAddressForm(defaultIsDefault = false) {
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [formRealName, setFormRealName] = useState("");
  const [formPhoneNumber, setFormPhoneNumber] = useState("");
  const [formRegion, setFormRegion] = useState("");
  const [formDistrict, setFormDistrict] = useState("");
  const [formWard, setFormWard] = useState("");
  const [formDetails, setFormDetails] = useState("");
  const [formHouseNumber, setFormHouseNumber] = useState("");
  const [formIsDefault, setFormIsDefault] = useState(defaultIsDefault);

  const fillForm = (address?: Address, addressCount = 0) => {
    if (address) {
      setEditingAddressId(address.id);
      setFormRealName(address.realName);
      setFormPhoneNumber(address.phoneNumber);
      const { region, district, ward, street } = splitAddressDetails(address.details);
      setFormRegion(region);
      setFormDistrict(district);
      setFormWard(ward);
      setFormDetails(street);
      setFormHouseNumber(address.houseNumber);
      setFormIsDefault(!!address.top);
      return;
    }
    setEditingAddressId(null);
    setFormRealName("");
    setFormPhoneNumber("");
    setFormRegion("");
    setFormDistrict("");
    setFormWard("");
    setFormDetails("");
    setFormHouseNumber("");
    setFormIsDefault(addressCount === 0);
  };

  const resetForm = () => {
    setEditingAddressId(null);
    setFormRealName("");
    setFormPhoneNumber("");
    setFormRegion("");
    setFormDistrict("");
    setFormWard("");
    setFormDetails("");
    setFormHouseNumber("");
    setFormIsDefault(false);
  };

  return {
    editingAddressId,
    setEditingAddressId,
    formRealName,
    setFormRealName,
    formPhoneNumber,
    setFormPhoneNumber,
    formRegion,
    setFormRegion,
    formDistrict,
    setFormDistrict,
    formWard,
    setFormWard,
    formDetails,
    setFormDetails,
    formHouseNumber,
    setFormHouseNumber,
    formIsDefault,
    setFormIsDefault,
    fillForm,
    resetForm,
  };
}
