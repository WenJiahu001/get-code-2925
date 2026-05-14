import { describe, expect, it } from "vitest";
import { formatShanghaiTime } from "../src/formatShanghaiTime.js";

describe("formatShanghaiTime", () => {
  it("将 ISO 时间格式化为中国上海时间", () => {
    expect(formatShanghaiTime("2026-05-13T10:00:00.000Z")).toBe("2026-05-13 18:00:00");
  });

  it("无效时间返回未知", () => {
    expect(formatShanghaiTime("未知")).toBe("未知");
    expect(formatShanghaiTime("not-a-date")).toBe("未知");
  });
});
