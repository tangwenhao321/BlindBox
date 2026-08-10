import { describe, expect, it } from "vitest";
import {
  ceremonyTierToDisplayQuality,
  resolveCeremonyTier,
  resolveHighestCeremonyTier,
} from "./ceremonyTier";

describe("ceremonyTier", () => {
  const legendary = (price: number) => ({
    id: "1",
    name: "Prize",
    price,
    qualityType: "LEGENDARY",
  });

  it("maps general and hidden without price logic", () => {
    expect(resolveCeremonyTier({ id: "a", name: "A", price: 1, qualityType: "GENERAL" })).toBe("GENERAL");
    expect(resolveCeremonyTier({ id: "b", name: "B", price: 1, qualityType: "HIDDEN" })).toBe("HIDDEN");
  });

  it("escalates legendary by price and batch rank", () => {
    const pool = [legendary(99), legendary(200), legendary(400)];
    expect(resolveCeremonyTier(legendary(99), pool)).toBe("TREASURE_LEGEND");
    expect(resolveCeremonyTier(legendary(200), pool)).toBe("TREASURE_LEGEND");
    expect(resolveCeremonyTier(legendary(400), pool)).toBe("TREASURE_PEERLESS");

    const duo = [legendary(99), legendary(200)];
    expect(resolveCeremonyTier(legendary(200), duo)).toBe("PEERLESS");
  });

  it("maps ceremony tiers to legacy display qualities", () => {
    expect(ceremonyTierToDisplayQuality("GENERAL")).toBe("GENERAL");
    expect(ceremonyTierToDisplayQuality("HIDDEN")).toBe("HIDDEN");
    expect(ceremonyTierToDisplayQuality("TREASURE_LEGEND")).toBe("LEGENDARY");
    expect(ceremonyTierToDisplayQuality("PEERLESS")).toBe("LEGENDARY");
    expect(ceremonyTierToDisplayQuality("TREASURE_PEERLESS")).toBe("LEGENDARY");
  });
});
