import { describe, expect, it } from "vitest";
import { classifyRefreshIssues } from "./refreshErrorPolicy";

describe("classifyRefreshIssues", () => {
  it("treats catalog rejection as blocking", () => {
    const result = classifyRefreshIssues(["首页加载失败", "地址：超时"], true);
    expect(result.blocking).toEqual(["首页加载失败"]);
    expect(result.advisory).toEqual(["地址：超时"]);
  });

  it("treats partial sync issues as advisory only", () => {
    const result = classifyRefreshIssues(["商城：超时", "余额：失败"], false);
    expect(result.blocking).toEqual([]);
    expect(result.advisory).toEqual(["商城：超时", "余额：失败"]);
  });

  it("returns empty buckets when there are no issues", () => {
    expect(classifyRefreshIssues([], false)).toEqual({ blocking: [], advisory: [] });
  });
});
