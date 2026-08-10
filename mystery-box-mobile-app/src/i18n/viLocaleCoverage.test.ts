import { describe, expect, it } from "vitest";
import enUS from "./locales/en-US";
import viVN from "./locales/vi-VN";

const TARGET_DIFFERENT_COUNT = 102;

describe("vi-VN locale coverage", () => {
  const enKeys = Object.keys(enUS as Record<string, unknown>).sort();
  const different: string[] = [];
  const identical: string[] = [];

  for (const namespace of enKeys) {
    const en = (enUS as Record<string, unknown>)[namespace];
    const vi = (viVN as Record<string, unknown>)[namespace];
    expect(vi).toBeDefined();
    if (JSON.stringify(vi) === JSON.stringify(en)) {
      identical.push(namespace);
    } else {
      different.push(namespace);
    }
  }

  it(`has at least ${TARGET_DIFFERENT_COUNT} namespaces that differ from en-US`, () => {
    expect(different.length).toBeGreaterThanOrEqual(TARGET_DIFFERENT_COUNT);
  });

  it("lists any namespaces still identical to en-US (should be none or technical-only)", () => {
    expect(identical).toEqual([]);
  });
});
