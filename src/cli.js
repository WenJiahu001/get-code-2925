import "dotenv/config";
import { buildMailConfig, fetchLatestMailCode } from "./fetchLatestMailCode.js";
import { formatShanghaiTime } from "./formatShanghaiTime.js";

try {
  const config = buildMailConfig();
  const result = await fetchLatestMailCode(config);
  console.log(`验证码：${result.code}`);
  console.log(`发件人：${result.sender}`);
  console.log(`时间：${formatShanghaiTime(result.time)}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
