import "dotenv/config";
import { buildMailConfig, diagnoseImapConnection } from "./fetchLatestMailCode.js";

try {
  const config = buildMailConfig();
  const maskedUser = config.auth.user.replace(/^(.{2}).*(@.*)$/, "$1***$2");
  console.log(`正在诊断 IMAP：${config.host}:${config.port}，SSL=${config.secure}，用户=${maskedUser}`);
  await diagnoseImapConnection(config);
  console.log("IMAP 连接和邮箱只读打开成功。");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
