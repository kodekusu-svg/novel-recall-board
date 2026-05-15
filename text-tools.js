function countCharacters(text) {
  const value = String(text || "");
  return {
    withWhitespace: [...value].length,
    withoutWhitespace: [...value.replace(/[\s　]/g, "")].length,
  };
}

function countExactOccurrences(text, value) {
  if (!text || !value) return 0;
  return [...String(text).matchAll(new RegExp(escapeRegExp(value), "g"))].length;
}

function indentParagraphs(text) {
  const noIndentStart = new Set([
    "「",
    "『",
    "」",
    "』",
    "（",
    "(",
    "【",
    "[",
    "《",
    "〈",
    "〔",
    "{",
    "｛",
    "“",
    "‘",
    "\"",
    "'",
    "、",
    "。",
    "，",
    "．",
    ",",
    ".",
    "！",
    "？",
    "!",
    "?",
    "…",
    "‥",
    "―",
    "—",
    "─",
    "・",
    "※",
    "＊",
    "*",
  ]);
  return String(text || "")
    .split(/(\r\n|\n|\r)/)
    .map((part, index, parts) => {
      if (index % 2 === 1 || !part.trim() || /^[ \t]*　/.test(part)) return part;
      const previousLine = String(parts[index - 2] || "");
      const previousText = parts.slice(0, index).join("");
      if (endsWithDialogueClose(previousLine) || hasUnclosedDialogueQuote(previousText)) return part;
      const firstVisible = part.trimStart().at(0);
      if (noIndentStart.has(firstVisible)) return part;
      return `　${part}`;
    })
    .join("");
}

function endsWithDialogueClose(value) {
  const meaningful = String(value || "")
    .trimEnd()
    .replace(/[、。，．.!！?？…‥）\]］】〉》〕｝]*$/u, "");
  return ["」", "』"].includes(meaningful.at(-1));
}

function hasUnclosedDialogueQuote(value) {
  let single = 0;
  let double = 0;
  [...String(value || "")].forEach((char) => {
    if (char === "「") single += 1;
    if (char === "」") single = Math.max(0, single - 1);
    if (char === "『") double += 1;
    if (char === "』") double = Math.max(0, double - 1);
  });
  return single > 0 || double > 0;
}

function scrollTextareaToIndex(textarea, index) {
  if (!textarea || !Number.isFinite(index)) return;
  const before = textarea.value.slice(0, Math.max(0, index));
  const lineIndex = before.split(/\r\n|\n|\r/).length - 1;
  const style = window.getComputedStyle(textarea);
  const fontSize = Number.parseFloat(style.fontSize) || 16;
  const lineHeight = Number.parseFloat(style.lineHeight) || fontSize * 1.7;
  textarea.scrollTop = Math.max(0, lineIndex * lineHeight - textarea.clientHeight * 0.35);
}

function scrollElementIntoNearestView(element) {
  if (!element) return;
  element.scrollIntoView({ block: "nearest", inline: "nearest" });
}
