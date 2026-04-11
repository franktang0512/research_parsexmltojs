const XLSX = require("xlsx");

const INPUT_FILE = "output_newtp_claud.xlsx";
const OUTPUT_FILE = "cleaned_output_claud.xlsx";

const NUMERIC_COLUMNS = new Set([
  "sid",
  "qid",
  "score",
  "abstraction",
  "decomposition",
  "generalization",
  "algorithm",
  "applying",
  "analyzing",
]);

function normalizeNumericValue(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isNaN(value) ? null : value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
}

function getFirstDefinedValue(row, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== undefined) {
      return row[key];
    }
  }
  return undefined;
}

function parseAiResult(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed || trimmed === "error_json") return null;

  return JSON.parse(trimmed);
}

function getScore(obj, key) {
  if (!obj || !obj[key]) return null;
  return obj[key].score ?? null;
}

const workbook = XLSX.readFile(INPUT_FILE);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet);

const output = [];
const skippedRows = [];

data.forEach((row, idx) => {
  const sid = getFirstDefinedValue(row, ["學生ID", "摮貊?ID"]);
  const qid = getFirstDefinedValue(row, ["題目ID", "憿ID"]);
  const score = getFirstDefinedValue(row, ["分數", "?"]);
  const aiStatus = getFirstDefinedValue(row, ["AI狀態", "AI狀?"]);
  const rawAiResult = getFirstDefinedValue(row, ["AI結果", "AI蝯?"]);

  try {
    if (!rawAiResult || rawAiResult === "error_json" || aiStatus === "error_json") {
      skippedRows.push({ row: idx, sid, qid, reason: "invalid_or_missing_ai_result" });
      return;
    }

    const aiResult = parseAiResult(rawAiResult);
    if (!aiResult) {
      skippedRows.push({ row: idx, sid, qid, reason: "empty_ai_result" });
      return;
    }

    const CT = aiResult.CT || {};
    const HOT = aiResult.HOT || {};

    const newRow = {
      sid: normalizeNumericValue(sid),
      qid: normalizeNumericValue(qid),
      score: normalizeNumericValue(score),
      abstraction: normalizeNumericValue(getScore(CT, "Abstraction")),
      decomposition: normalizeNumericValue(getScore(CT, "Decomposition")),
      pattern: getScore(CT, "Pattern"),
      generalization: normalizeNumericValue(getScore(CT, "Generalization")),
      algorithm: normalizeNumericValue(getScore(CT, "Algorithm")),
      applying: normalizeNumericValue(getScore(HOT, "Applying")),
      analyzing: normalizeNumericValue(getScore(HOT, "Analyzing")),
      evaluating: getScore(HOT, "Evaluating"),
      creating: getScore(HOT, "Creating"),
      analysis: aiResult.analysis || "",
    };

    output.push(newRow);
  } catch (err) {
    skippedRows.push({ row: idx, sid, qid, reason: err.message });
    console.log(`Skipping row ${idx} (sid=${sid}, qid=${qid}): ${err.message}`);
  }
});

output.forEach((row) => {
  for (const col of NUMERIC_COLUMNS) {
    if (Object.prototype.hasOwnProperty.call(row, col)) {
      row[col] = normalizeNumericValue(row[col]);
    }
  }
});

const newSheet = XLSX.utils.json_to_sheet(output);
const newWorkbook = XLSX.utils.book_new();

XLSX.utils.book_append_sheet(newWorkbook, newSheet, "cleaned");
XLSX.writeFile(newWorkbook, OUTPUT_FILE);

console.log(`Processed ${output.length} rows.`);
if (skippedRows.length > 0) {
  console.log(`Skipped ${skippedRows.length} rows with invalid AI JSON.`);
  skippedRows.slice(0, 10).forEach(({ row, sid, qid, reason }) => {
    console.log(`  row ${row} (sid=${sid}, qid=${qid}): ${reason}`);
  });
}
console.log(`Done. Wrote ${OUTPUT_FILE}`);
