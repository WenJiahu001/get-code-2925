import { describe, expect, it } from "vitest";
import { getMailCodeFingerprint, parsePollIntervalSeconds } from "../src/watchLatestMailCode.js";

describe("parsePollIntervalSeconds", () => {
  it("未配置时使用默认秒数", () => {
    expect(parsePollIntervalSeconds(undefined)).toBe(5);
    expect(parsePollIntervalSeconds("")).toBe(5);
  });

  it("读取自定义秒数", () => {
    expect(parsePollIntervalSeconds("3")).toBe(3);
    expect(parsePollIntervalSeconds("0.5")).toBe(0.5);
  });

  it("拒绝无效秒数", () => {
    expect(() => parsePollIntervalSeconds("0")).toThrow("POLL_INTERVAL_SECONDS");
    expect(() => parsePollIntervalSeconds("-1")).toThrow("POLL_INTERVAL_SECONDS");
    expect(() => parsePollIntervalSeconds("abc")).toThrow("POLL_INTERVAL_SECONDS");
  });
});

describe("getMailCodeFingerprint", () => {
  it("用验证码、发件人和时间共同判断是否变化", () => {
    expect(getMailCodeFingerprint({ code: "123456", sender: "a@example.com", time: "2026-05-13T10:00:00.000Z" }))
      .toBe(getMailCodeFingerprint({ code: "123456", sender: "a@example.com", time: "2026-05-13T10:00:00.000Z" }));

    expect(getMailCodeFingerprint({ code: "654321", sender: "a@example.com", time: "2026-05-13T10:00:00.000Z" }))
      .not.toBe(getMailCodeFingerprint({ code: "123456", sender: "a@example.com", time: "2026-05-13T10:00:00.000Z" }));
  });
});
