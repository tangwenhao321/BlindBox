import { useEffect, useState } from "react";
import { getAppLocale } from "../utils/i18nLocale";
import { findVietnamRegionByLabel, getVietnamRegionOptions } from "../data/vietnamRegions";
import { fetchGhnDistricts, fetchGhnProvinces, fetchGhnWards } from "../services/ghnAddressService";

export function useGhnAddressCascade(region: string, district: string, enabled = getAppLocale() === "vi-VN") {
  const [districtOptions, setDistrictOptions] = useState<string[]>([]);
  const [wardOptions, setWardOptions] = useState<string[]>([]);
  const [districtCodes, setDistrictCodes] = useState<Record<string, string>>({});
  const [provinceOptions, setProvinceOptions] = useState<string[]>(() =>
    enabled ? getVietnamRegionOptions() : [],
  );

  useEffect(() => {
    if (!enabled) return;
    void fetchGhnProvinces().then((rows) => {
      if (rows.length) {
        setProvinceOptions(rows.map((row) => row.name));
      }
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !region) {
      setDistrictOptions([]);
      setDistrictCodes({});
      return;
    }
    const regionMeta = findVietnamRegionByLabel(region);
    const provinceCode = regionMeta?.code ?? region;
    void fetchGhnDistricts(provinceCode).then((rows) => {
      setDistrictOptions(rows.map((row) => row.name));
      setDistrictCodes(Object.fromEntries(rows.map((row) => [row.name, row.id])));
    });
  }, [enabled, region]);

  useEffect(() => {
    if (!enabled || !district) {
      setWardOptions([]);
      return;
    }
    const districtCode = districtCodes[district];
    if (!districtCode) return;
    void fetchGhnWards(districtCode).then((rows) => {
      setWardOptions(rows.map((row) => row.name));
    });
  }, [district, districtCodes, enabled]);

  return { provinceOptions, districtOptions, wardOptions };
}
