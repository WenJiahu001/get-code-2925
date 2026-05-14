import { describe, expect, it } from "vitest";
import { buildMailConfig, selectLatestCodeFromMessages } from "../src/fetchLatestMailCode.js";

function rawMail({ from = "OpenAI <noreply@example.com>", date, body }) {
  return [
    `From: ${from}`,
    `Date: ${date}`,
    "Subject: verification",
    "Content-Type: text/plain; charset=utf-8",
    "",
    body
  ].join("\r\n");
}

describe("buildMailConfig", () => {
  it("读取最近邮件扫描数量配置", () => {
    const config = buildMailConfig({
      MAIL_IMAP_HOST: "imap.example.com",
      MAIL_USER: "user@example.com",
      MAIL_PASS: "pass",
      RECENT_MAIL_LIMIT: "30"
    });

    expect(config.recentMailLimit).toBe(30);
  });

  it("默认扫描最近 20 封邮件", () => {
    const config = buildMailConfig({
      MAIL_IMAP_HOST: "imap.example.com",
      MAIL_USER: "user@example.com",
      MAIL_PASS: "pass"
    });

    expect(config.recentMailLimit).toBe(20);
  });
});

describe("selectLatestCodeFromMessages", () => {
  it("从最近邮件中按邮件时间选择最新验证码，而不是选择最后一封", async () => {
    const result = await selectLatestCodeFromMessages([
      {
        source: rawMail({
          date: "Thu, 14 May 2026 09:00:34 +0800",
          body: "验证码：986299"
        })
      },
      {
        source: rawMail({
          date: "Wed, 13 May 2026 11:34:13 +0800",
          body: "验证码：554320"
        })
      }
    ]);

    expect(result).toMatchObject({
      code: "986299",
      time: "2026-05-14T01:00:34.000Z"
    });
  });

  it("忽略没有验证码的邮件", async () => {
    const result = await selectLatestCodeFromMessages([
      {
        source: rawMail({
          date: "Thu, 14 May 2026 09:02:00 +0800",
          body: "欢迎使用"
        })
      },
      {
        source: rawMail({
          date: "Thu, 14 May 2026 09:00:34 +0800",
          body: "验证码：986299"
        })
      }
    ]);

    expect(result.code).toBe("986299");
  });
});
