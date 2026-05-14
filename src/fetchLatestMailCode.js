import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import fs from "node:fs";
import { DEFAULT_CODE_REGEX, parseCode } from "./parseCode.js";

function required(value, name) {
  if (!value) {
    throw new Error(`缺少必要环境变量：${name}`);
  }

  return value;
}

function toBoolean(value, defaultValue = true) {
  if (value === undefined || value === "") {
    return defaultValue;
  }

  return String(value).toLowerCase() === "true";
}

function validateDotenvPassword(env = process.env) {
  if (env.MAIL_PASS?.includes("#")) {
    return;
  }

  if (!fs.existsSync(".env")) {
    return;
  }

  const rawEnv = fs.readFileSync(".env", "utf8");
  const rawLine = rawEnv
    .split(/\r?\n/)
    .find(line => line.startsWith("MAIL_PASS="));

  if (!rawLine) {
    return;
  }

  const rawValue = rawLine.slice("MAIL_PASS=".length).trim();
  if (rawValue.includes("#") && !rawValue.startsWith("\"") && !rawValue.startsWith("'")) {
    throw new Error('检测到 .env 中的 MAIL_PASS 包含 # 但未加引号。dotenv 会把 # 后内容当成注释，请改成 MAIL_PASS="你的完整密码"。');
  }
}

function formatConnectionError(error, config) {
  const message = error instanceof Error ? error.message : String(error);
  const responseText = error instanceof Error && error.responseText ? `\n服务器响应：${error.responseText}` : "";
  const isAuthError = /LOGIN failed|Authentication credentials invalid|AUTHENTICATIONFAILED/i.test(`${message} ${responseText}`);
  const hints = [
    isAuthError ? "IMAP 登录失败：账号或授权码不正确" : `IMAP 连接失败：${message}${responseText}`,
    `当前连接配置：${config.host}:${config.port}，SSL=${config.secure}`,
    "请检查 MAIL_IMAP_HOST 是否是 IMAP 服务器地址，不是网页登录地址。",
    "常见配置：SSL 端口 993 对应 MAIL_IMAP_SECURE=true；非 SSL 端口 143 对应 MAIL_IMAP_SECURE=false。",
    "请确认邮箱后台已开启 IMAP，并使用 IMAP 授权码或应用专用密码。"
  ];

  return new Error(hints.join("\n"));
}

function createClient(config, onError) {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    logger: false
  });

  client.on("error", onError);
  return client;
}

export function buildMailConfig(env = process.env) {
  validateDotenvPassword(env);

  const port = Number(env.MAIL_IMAP_PORT || 993);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("MAIL_IMAP_PORT 必须是有效端口号");
  }

  return {
    host: required(env.MAIL_IMAP_HOST, "MAIL_IMAP_HOST"),
    port,
    secure: toBoolean(env.MAIL_IMAP_SECURE, true),
    auth: {
      user: required(env.MAIL_USER, "MAIL_USER"),
      pass: required(env.MAIL_PASS, "MAIL_PASS"),
      loginMethod: env.MAIL_LOGIN_METHOD || "LOGIN"
    },
    mailbox: env.MAILBOX || "INBOX",
    codeRegex: env.CODE_REGEX || DEFAULT_CODE_REGEX
  };
}

export async function fetchLatestMailCode(config) {
  let lastClientError;
  const client = createClient(config, error => {
    lastClientError = error;
  });

  try {
    try {
      await client.connect();
    } catch (error) {
      throw formatConnectionError(lastClientError || error, config);
    }

    const lock = await client.getMailboxLock(config.mailbox, { readOnly: true });
    try {
      if (!client.mailbox.exists) {
        throw new Error(`邮箱 ${config.mailbox} 中没有邮件`);
      }

      const latest = await client.fetchOne("*", { source: true });
      if (!latest?.source) {
        throw new Error("无法读取最新邮件内容");
      }

      const parsed = await simpleParser(latest.source);
      const code = parseCode({ text: parsed.text, html: parsed.html }, config.codeRegex);

      if (!code) {
        throw new Error("最新邮件中未找到验证码");
      }

      return {
        code,
        sender: parsed.from?.text || "未知",
        time:
          parsed.date instanceof Date && !Number.isNaN(parsed.date.getTime())
            ? parsed.date.toISOString()
            : "未知"
      };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
}

export async function diagnoseImapConnection(config) {
  let lastClientError;
  const client = createClient(config, error => {
    lastClientError = error;
  });

  try {
    await client.connect();
    await client.getMailboxLock(config.mailbox, { readOnly: true }).then(lock => lock.release());
  } catch (error) {
    throw formatConnectionError(lastClientError || error, config);
  } finally {
    await client.logout().catch(() => {});
  }
}
