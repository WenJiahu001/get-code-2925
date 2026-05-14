const SHANGHAI_TIME_ZONE = "Asia/Shanghai";

const formatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: SHANGHAI_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false
});

function getPart(parts, type) {
  return parts.find(part => part.type === type)?.value;
}

export function formatShanghaiTime(value) {
  if (!value || value === "未知") {
    return "未知";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "未知";
  }

  const parts = formatter.formatToParts(date);
  const year = getPart(parts, "year");
  const month = getPart(parts, "month");
  const day = getPart(parts, "day");
  const hour = getPart(parts, "hour");
  const minute = getPart(parts, "minute");
  const second = getPart(parts, "second");

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

export { SHANGHAI_TIME_ZONE };
