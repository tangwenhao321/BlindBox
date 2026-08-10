import { describe, expect, it } from "vitest";
import {
  buildRevealProgressModel,
  isFinaleTeaser,
  resolveInterRevealGapMs,
  resolveComfortGapBoost,
  resolveRevealPacing,
  shouldPlayBoxTeaser,
} from "./revealSequenceEngine";

describe("revealSequenceEngine", () => {
  it("uses surprise beats and ramp for long multi-draw", () => {
    expect(resolveRevealPacing(0, 10)).toBe("normal");
    expect(resolveRevealPacing(1, 10)).toBe("fast");
    expect(resolveRevealPacing(2, 10)).toBe("normal");
    expect(resolveRevealPacing(8, 10)).toBe("normal");
    expect(resolveRevealPacing(9, 10)).toBe("finale");
  });

  it("uses fast pacing for short multi-draw middle indices", () => {
    expect(resolveRevealPacing(1, 5)).toBe("fast");
  });

  it("uses normal before finale when total > 2", () => {
    expect(resolveRevealPacing(3, 5)).toBe("normal");
  });

  it("uses finale or ceremony on last index", () => {
    expect(resolveRevealPacing(4, 5)).toBe("finale");
    expect(resolveRevealPacing(0, 1, "PEERLESS")).toBe("ceremony");
  });

  it("resolves inter-reveal gaps with finale pause", () => {
    const remote = { interDrawDelayMs: 280, finalePauseMs: 420 };
    expect(resolveInterRevealGapMs(0, 5, remote)).toBe(280);
    expect(resolveInterRevealGapMs(3, 5, remote)).toBe(420);
    expect(resolveInterRevealGapMs(4, 5, remote)).toBe(0);
  });

  it("controls box teaser for first, beats, and finale draws", () => {
    expect(shouldPlayBoxTeaser(0, 5)).toBe(true);
    expect(shouldPlayBoxTeaser(4, 5)).toBe(true);
    expect(shouldPlayBoxTeaser(2, 5)).toBe(true);
    expect(shouldPlayBoxTeaser(1, 5)).toBe(false);
    expect(shouldPlayBoxTeaser(4, 5, { finaleTeaserEnabled: false } as never)).toBe(false);
    expect(isFinaleTeaser(4, 5)).toBe(true);
    expect(isFinaleTeaser(0, 5)).toBe(false);
  });

  it("builds progress model without spoiling finale", () => {
    const all = [
      { id: "1", name: "A", qualityType: "GENERAL", price: 0 },
      { id: "2", name: "B", qualityType: "HIDDEN", price: 0 },
      { id: "3", name: "C", qualityType: "LEGENDARY", price: 400 },
    ];
    const revealed = [all[0]];
    const rareModel = buildRevealProgressModel(revealed, all, 0, 3);
    expect(rareModel.subtitleKey).toBe("progressDefault");

    const generalStreak = [all[0], { id: "4", name: "D", qualityType: "GENERAL", price: 0 }];
    const comfortModel = buildRevealProgressModel(generalStreak, [...all, generalStreak[1]], 1, 5);
    expect(comfortModel.subtitleKey).toBe("progressComfort");

    const withHidden = [all[0], all[1]];
    const finaleSoon = buildRevealProgressModel(withHidden, all, 3, 5);
    expect(finaleSoon.subtitleKey).toBe("progressFinaleSoon");
    expect(finaleSoon.current).toBe(4);
  });

  it("builds comfort gap for consecutive general draws", () => {
    const all = [
      { id: "1", name: "A", qualityType: "GENERAL", price: 0 },
      { id: "2", name: "B", qualityType: "GENERAL", price: 0 },
      { id: "3", name: "C", qualityType: "GENERAL", price: 0 },
    ];
    const boost = resolveComfortGapBoost([all[0], all[1], all[2]], all);
    expect(boost.streak).toBe(3);
    expect(boost.gapBoostMs).toBe(0);
  });
});
