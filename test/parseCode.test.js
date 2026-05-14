import { describe, expect, it } from "vitest";
import { parseCode } from "../src/parseCode.js";

describe("parseCode", () => {
  it("从普通中文正文中提取 6 位数字验证码", () => {
    expect(parseCode("您的验证码是 123456，5 分钟内有效。")).toBe("123456");
  });

  it("从 HTML 邮件中提取验证码", () => {
    expect(parseCode({ html: "<p>验证码：<strong>654321</strong></p>" })).toBe("654321");
  });

  it("多个数字时返回第一个符合规则的验证码", () => {
    expect(parseCode("订单 12 已创建，验证码 987654，请勿泄露。")).toBe("987654");
  });

  it("没有验证码时返回 null", () => {
    expect(parseCode("这封邮件没有任何验证码")).toBeNull();
  });
});
