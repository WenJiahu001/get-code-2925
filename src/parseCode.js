import { htmlToText } from "html-to-text";

const DEFAULT_CODE_REGEX = String.raw`\b\d{4,8}\b`;

function toRegex(pattern) {
  if (pattern instanceof RegExp) {
    return pattern;
  }

  return new RegExp(pattern || DEFAULT_CODE_REGEX);
}

function normalizeContent({ text, html } = {}) {
  const parts = [];

  if (text) {
    parts.push(String(text));
  }

  if (html) {
    parts.push(
      htmlToText(String(html), {
        wordwrap: false,
        selectors: [
          { selector: "a", options: { ignoreHref: true } },
          { selector: "img", format: "skip" }
        ]
      })
    );
  }

  return parts.join("\n");
}

export function parseCode(message, pattern = DEFAULT_CODE_REGEX) {
  const content = typeof message === "string" ? message : normalizeContent(message);
  const match = content.match(toRegex(pattern));

  return match ? match[0] : null;
}

export { DEFAULT_CODE_REGEX };
