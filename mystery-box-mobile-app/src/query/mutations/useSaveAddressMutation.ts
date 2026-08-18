import { useMutation } from "@tanstack/react-query";
import { saveAddressForUser } from "../../services/addressService";
import { invalidateAddressQueries } from "../../utils/invalidateAppQueries";

export type SaveAddressVariables = {
  id?: string;
  realName: string;
  phoneNumber: string;
  details: string;
  houseNumber: string;
  province?: string;
  city?: string;
  district?: string;
  top?: boolean;
};

export function useSaveAddressMutation(token: string) {
  return useMutation({
    mutationFn: (payload: SaveAddressVariables) =>
      saveAddressForUser(token, {
        id: payload.id,
        realName: payload.realName,
        phoneNumber: payload.phoneNumber,
        details: payload.details,
        houseNumber: payload.houseNumber,
        province: payload.province,
        city: payload.city,
        district: payload.district,
        top: payload.top,
      }),
    onSuccess: () => {
      invalidateAddressQueries(token);
    },
  });
}
