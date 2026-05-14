const DEFAULT_POLL_INTERVAL_SECONDS = 5;

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

export function parsePollIntervalSeconds(value, defaultValue = DEFAULT_POLL_INTERVAL_SECONDS) {
  if (value === undefined || value === "") {
    return defaultValue;
  }

  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error("POLL_INTERVAL_SECONDS 必须是大于 0 的数字");
  }

  return seconds;
}

export function getMailCodeFingerprint(result) {
  return [result.code, result.sender, result.time].join("\u0000");
}

export async function watchLatestMailCode({
  config,
  fetchLatestMailCode,
  intervalSeconds = DEFAULT_POLL_INTERVAL_SECONDS,
  onChange,
  onError,
  signal
}) {
  if (typeof fetchLatestMailCode !== "function") {
    throw new Error("缺少 fetchLatestMailCode 函数");
  }

  if (typeof onChange !== "function") {
    throw new Error("缺少 onChange 回调");
  }

  const intervalMs = intervalSeconds * 1000;
  let lastFingerprint;

  while (!signal?.aborted) {
    try {
      const result = await fetchLatestMailCode(config);
      const fingerprint = getMailCodeFingerprint(result);

      if (fingerprint !== lastFingerprint) {
        lastFingerprint = fingerprint;
        onChange(result);
      }
    } catch (error) {
      onError?.(error);
    }

    if (!signal?.aborted) {
      await sleep(intervalMs);
    }
  }
}

export { DEFAULT_POLL_INTERVAL_SECONDS };
