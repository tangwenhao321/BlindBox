import { describe, expect, it } from "vitest";
import {
  appendCloudImageProcessParams,
  resolveNetworkTierImageUri,
  setRevealNetworkTier,
} from "./revealNetworkTier";

describe("appendCloudImageProcessParams", () => {
  it("appends Aliyun OSS resize", () => {
    const uri = "https://bucket.oss-cn-hangzhou.aliyuncs.com/a/b.jpg";
    expect(appendCloudImageProcessParams(uri, 400)).toBe(
      `${uri}?x-oss-process=image/resize,w_400`,
    );
  });

  it("appends Tencent COS imageView2", () => {
    const uri = "https://bucket-1250000000.cos.ap-guangzhou.myqcloud.com/pic.png";
    expect(appendCloudImageProcessParams(uri, 320)).toBe(`${uri}?imageView2/2/w/320`);
  });

  it("does not double-append process params", () => {
    const uri = "https://x.aliyuncs.com/a.jpg?x-oss-process=image/resize,w_200";
    expect(appendCloudImageProcessParams(uri, 400)).toBe(uri);
  });

  it("leaves non-cloud hosts alone", () => {
    expect(appendCloudImageProcessParams("https://cdn.example.com/a.jpg", 400)).toBeNull();
  });
});

describe("resolveNetworkTierImageUri", () => {
  it("uses OSS params on wifi for known hosts", () => {
    setRevealNetworkTier("wifi");
    const uri = "https://img.aliyuncs.com/item.jpg";
    expect(resolveNetworkTierImageUri(uri)).toContain("x-oss-process=image/resize,w_400");
  });

  it("allows larger wifi hero width via targetWidth", () => {
    setRevealNetworkTier("wifi");
    const uri = "https://img.aliyuncs.com/hero.jpg";
    expect(resolveNetworkTierImageUri(uri, "wifi", 1080)).toContain("x-oss-process=image/resize,w_1080");
  });

  it("caps wifi hero targetWidth at 1200", () => {
    setRevealNetworkTier("wifi");
    const uri = "https://img.aliyuncs.com/hero.jpg";
    expect(resolveNetworkTierImageUri(uri, "wifi", 2000)).toContain("x-oss-process=image/resize,w_1200");
  });

  it("keeps generic query fallback for non-OSS cellular", () => {
    setRevealNetworkTier("cellular");
    expect(resolveNetworkTierImageUri("https://cdn.example.com/a.jpg")).toBe(
      "https://cdn.example.com/a.jpg?w=320&q=70",
    );
  });

  it("leaves non-OSS wifi unchanged", () => {
    setRevealNetworkTier("wifi");
    expect(resolveNetworkTierImageUri("https://cdn.example.com/a.jpg")).toBe(
      "https://cdn.example.com/a.jpg",
    );
  });
});
