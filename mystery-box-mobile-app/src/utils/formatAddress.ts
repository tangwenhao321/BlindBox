import type { Address } from "../types";

export function formatAddressSummary(address: Address | undefined | null): string | null {
  if (!address) return null;
  const line = [address.details, address.houseNumber].filter(Boolean).join(" ");
  const who = [address.realName, address.phoneNumber].filter(Boolean).join(" · ");
  if (!line && !who) return null;
  return who ? `${who}\n${line}` : line;
}
