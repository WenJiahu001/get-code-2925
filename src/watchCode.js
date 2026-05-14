import "dotenv/config";
import { buildMailConfig, fetchLatestMailCode } from "./fetchLatestMailCode.js";
import { formatShanghaiTime } from "./formatShanghaiTime.js";
import { parsePollIntervalSeconds, watchLatestMailCode } from "./watchLatestMailCode.js";

function printResult(result) {
  console.log(`验证码：${result.code}`);
  console.log(`发件人：${result.sender}`);
  console.log(`时间：${formatShanghaiTime(result.time)}`);
  console.log("");
}

const abortController = new AbortController();
process.on("SIGINT", () => {
  abortController.abort();
  console.log("\n已停止检测");
});

try {
  const config = buildMailConfig();
  const intervalSeconds = parsePollIntervalSeconds(process.env.POLL_INTERVAL_SECONDS);

  console.log(`开始检测最新验证码，每 ${intervalSeconds} 秒检查一次。按 Ctrl+C 停止。`);
  await watchLatestMailCode({
    config,
    fetchLatestMailCode,
    intervalSeconds,
    signal: abortController.signal,
    onChange: printResult,
    onError(error) {
      console.error(error instanceof Error ? error.message : String(error));
    }
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
