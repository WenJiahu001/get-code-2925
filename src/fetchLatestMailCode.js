import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import fs from "node:fs";
import { DEFAULT_CODE_REGEX, parseCode } from "./parseCode.js";

const DEFAULT_RECENT_MAIL_LIMIT = 20;

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

function toPositiveInteger(value, defaultValue, name) {
  if (value === undefined || value === "") {
    return defaultValue;
  }

  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${name} 必须是大于 0 的整数`);
  }

  return number;
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
    codeRegex: env.CODE_REGEX || DEFAULT_CODE_REGEX,
    recentMailLimit: toPositiveInteger(env.RECENT_MAIL_LIMIT, DEFAULT_RECENT_MAIL_LIMIT, "RECENT_MAIL_LIMIT")
  };
}

function toValidDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getMessageDate(parsed, message) {
  return toValidDate(parsed.date) || toValidDate(message.envelope?.date) || toValidDate(message.internalDate);
}

export async function selectLatestCodeFromMessages(messages, codeRegex = DEFAULT_CODE_REGEX) {
  let latestCodeMessage = null;

  for (const message of messages) {
    if (!message?.source) {
      continue;
    }

    const parsed = await simpleParser(message.source);
    const code = parseCode({ text: parsed.text, html: parsed.html }, codeRegex);
    if (!code) {
      continue;
    }

    const date = getMessageDate(parsed, message);
    const timestamp = date?.getTime() ?? 0;
    const candidate = {
      code,
      sender: parsed.from?.text || "未知",
      time: date ? date.toISOString() : "未知",
      timestamp
    };

    if (!latestCodeMessage || candidate.timestamp > latestCodeMessage.timestamp) {
      latestCodeMessage = candidate;
    }
  }

  if (!latestCodeMessage) {
    return null;
  }

  return {
    code: latestCodeMessage.code,
    sender: latestCodeMessage.sender,
    time: latestCodeMessage.time
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

      const start = Math.max(1, client.mailbox.exists - config.recentMailLimit + 1);
      const messages = [];
      for await (const message of client.fetch(`${start}:*`, { source: true, envelope: true, internalDate: true })) {
        messages.push(message);
      }

      const latestCode = await selectLatestCodeFromMessages(messages, config.codeRegex);
      if (!latestCode) {
        throw new Error(`最近 ${messages.length} 封邮件中未找到验证码`);
      }

      return latestCode;
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
}

export { DEFAULT_RECENT_MAIL_LIMIT };

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
