import { describe, expect, it } from "vitest";
import { syncRevealExperimentFromConfig, getActiveRevealVariant } from "./revealExperiment";

describe("revealExperiment", () => {
  it("maps template id to variant", () => {
    syncRevealExperimentFromConfig("experiment_calm_vs_turbo_calm", "v1");
    expect(getActiveRevealVariant()).toBe("calm");
    syncRevealExperimentFromConfig("experiment_calm_vs_turbo_turbo", "v2");
    expect(getActiveRevealVariant()).toBe("turbo");
  });
});
