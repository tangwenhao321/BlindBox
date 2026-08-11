import { describe, expect, it } from "vitest";
import { resolveTierVoiceLineUri } from "./revealVoiceLines";

describe("resolveTierVoiceLineUri", () => {
  it("resolves tier and theme keys", () => {
    expect(
      resolveTierVoiceLineUri("HIDDEN", "neon", {
        "neon:HIDDEN": "https://cdn.example/voice-hidden.mp3",
      }),
    ).toBe("https://cdn.example/voice-hidden.mp3");

    expect(
      resolveTierVoiceLineUri("LEGENDARY", undefined, {
        LEGENDARY: "https://cdn.example/legend.mp3",
      }),
    ).toBe("https://cdn.example/legend.mp3");
  });

  it("returns null quietly when missing", () => {
    expect(resolveTierVoiceLineUri("GENERAL", "cute", {})).toBeNull();
    expect(resolveTierVoiceLineUri("GENERAL", "cute", null)).toBeNull();
  });
});
