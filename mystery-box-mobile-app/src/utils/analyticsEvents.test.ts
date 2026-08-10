import { describe, expect, it } from "vitest";
import {
  ANALYTICS_EVENTS,
  isAnalyticsEventName,
  isTrackableEventName,
} from "./analyticsEvents";

describe("analyticsEvents", () => {
  it("exposes stable snake_case event names", () => {
    expect(ANALYTICS_EVENTS.SEARCH_SUBMIT).toBe("search_submit");
    expect(ANALYTICS_EVENTS.LOGIN_SUCCESS).toBe("login_success");
    expect(ANALYTICS_EVENTS.PAYMENT_SUCCESS).toBe("payment_success");
    expect(ANALYTICS_EVENTS.MARKETPLACE_LIST_CREATE).toBe("marketplace_list_create");
  });

  it("validates known analytics event names", () => {
    expect(isAnalyticsEventName("search_submit")).toBe(true);
    expect(isAnalyticsEventName("login_success")).toBe(true);
    expect(isAnalyticsEventName("not_a_real_event")).toBe(false);
  });

  it("accepts effect telemetry prefixes", () => {
    expect(isTrackableEventName("effect_reveal_complete")).toBe(true);
    expect(isTrackableEventName("login_success")).toBe(true);
    expect(isTrackableEventName("random_event")).toBe(false);
  });

  it("covers all catalogued events with snake_case values", () => {
    for (const value of Object.values(ANALYTICS_EVENTS)) {
      expect(value).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(isAnalyticsEventName(value)).toBe(true);
    }
  });
});
