import { describe, expect, it } from "vitest";
import { OFFLINE_KIND_ACTION_KEYS, offlineKindToActionKey } from "./offlineKindActionKey";
import type { OfflineMutationKind } from "../offline/offlineMutationTypes";

describe("offlineKindToActionKey", () => {
  it("covers every offline mutation kind", () => {
    const kinds = Object.keys(OFFLINE_KIND_ACTION_KEYS) as OfflineMutationKind[];
    expect(kinds.length).toBeGreaterThan(10);
    for (const kind of kinds) {
      expect(offlineKindToActionKey(kind)).toMatch(/^offline\.action/);
    }
  });

  it("returns stable keys for common actions", () => {
    expect(offlineKindToActionKey("createOrder")).toBe("offline.actionOrder");
    expect(offlineKindToActionKey("marketplaceBuy")).toBe("offline.actionBuy");
  });
});
