const SHEET_NAME = "feedback";
const SPREADSHEET_ID = "";
const MAX_ITEMS_PER_REQUEST = 100;
const MAX_TEXT_LENGTH = 120;
const ALLOWED_DECISIONS = new Set(["accepted_name", "rejected_name"]);

const HEADERS = [
  "receivedAt",
  "payloadAppVersion",
  "payloadRulesVersion",
  "clientId",
  "projectId",
  "locale",
  "feedbackId",
  "createdAt",
  "decision",
  "surface",
  "normalized",
  "kind",
  "reasons",
  "score",
  "countInSource",
  "extractionMode",
  "sourceLength",
  "itemAppVersion",
  "itemRulesVersion",
];

function setup() {
  const sheet = getFeedbackSheet_();
  ensureHeader_(sheet);
}

function doGet() {
  return json_({
    ok: true,
    name: "ノベ磁針 feedback endpoint",
  });
}

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    const feedback = normalizeFeedbackItems_(payload.feedback);
    const sheet = getFeedbackSheet_();
    ensureHeader_(sheet);

    const receivedAt = new Date().toISOString();
    const rows = feedback.map((item) => [
      receivedAt,
      textOrEmpty_(payload.appVersion, 40),
      textOrEmpty_(payload.rulesVersion, 80),
      textOrEmpty_(payload.clientId, 80),
      textOrEmpty_(payload.projectId, 80),
      textOrEmpty_(payload.locale, 20),
      item.id,
      item.createdAt,
      item.decision,
      item.surface,
      item.normalized,
      item.kind,
      item.reasons.join(","),
      item.score,
      item.countInSource,
      item.extractionMode,
      item.sourceLength,
      item.appVersion,
      item.rulesVersion,
    ]);

    if (rows.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADERS.length).setValues(rows);
    }

    return json_({ ok: true, count: rows.length });
  } catch (error) {
    return json_({
      ok: false,
      error: String(error && error.message ? error.message : error),
    });
  }
}

function parsePayload_(e) {
  const contents = e && e.postData && e.postData.contents ? e.postData.contents : "{}";
  try {
    const parsed = JSON.parse(contents);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

function normalizeFeedbackItems_(value) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, MAX_ITEMS_PER_REQUEST)
    .map(normalizeFeedbackItem_)
    .filter(Boolean);
}

function normalizeFeedbackItem_(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;

  const decision = textOrEmpty_(item.decision, 40);
  const surface = textOrEmpty_(item.surface, MAX_TEXT_LENGTH);
  const normalized = textOrEmpty_(item.normalized, MAX_TEXT_LENGTH);
  if (!ALLOWED_DECISIONS.has(decision) || !surface || !normalized) return null;

  const reasons = Array.isArray(item.reasons)
    ? item.reasons.map((reason) => textOrEmpty_(reason, 40)).filter(Boolean).slice(0, 12)
    : [];

  return {
    id: textOrEmpty_(item.id, 80),
    createdAt: textOrEmpty_(item.createdAt, 40),
    decision,
    surface,
    normalized,
    kind: textOrEmpty_(item.kind, 40),
    reasons,
    score: finiteNumberOrZero_(item.score),
    countInSource: finiteNumberOrZero_(item.countInSource),
    extractionMode: textOrEmpty_(item.extractionMode, 20),
    sourceLength: finiteNumberOrZero_(item.sourceLength),
    appVersion: textOrEmpty_(item.appVersion, 40),
    rulesVersion: textOrEmpty_(item.rulesVersion, 80),
  };
}

function textOrEmpty_(value, maxLength) {
  if (typeof value !== "string") return "";
  const text = value.trim().slice(0, maxLength);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function finiteNumberOrZero_(value) {
  return typeof value === "number" && isFinite(value) ? value : 0;
}

function getFeedbackSheet_() {
  const spreadsheet = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error("Spreadsheet not found. Bind this script to a spreadsheet or set SPREADSHEET_ID.");
  }

  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function ensureHeader_(sheet) {
  const firstRow = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const hasHeader = firstRow.some(Boolean);
  if (!hasHeader) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
