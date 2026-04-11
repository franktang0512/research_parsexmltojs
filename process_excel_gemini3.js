const XLSX = require("xlsx");
const fs = require("fs");

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

// 讀你的 Excel
const workbook = XLSX.readFile("output_newtp_gemini3.xlsx");
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// 轉成 JSON
const data = XLSX.utils.sheet_to_json(sheet);

const output = [];

data.forEach((row, idx) => {
  try {
    const sid = row["學生ID"];
    const qid = row["題目ID"];
    const score = row["分數"];

    let aiResult = row["AI結果"];

    if (!aiResult) return;

    // 有些 Excel 會把 JSON 當字串，要 parse
    if (typeof aiResult === "string") {
      aiResult = JSON.parse(aiResult);
    }

    const analysis = aiResult.analysis || "";

    const CT = aiResult.CT || {};
    const HOT = aiResult.HOT || {};

    const getScore = (obj, key) => {
      if (!obj[key]) return null;
      return obj[key].score ?? null;
    };

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

      解題分析: analysis
    };

    output.push(newRow);

  } catch (err) {
    console.log("Error at row", idx, err);
  }
});

output.forEach((row) => {
  for (const col of NUMERIC_COLUMNS) {
    if (Object.prototype.hasOwnProperty.call(row, col)) {
      row[col] = normalizeNumericValue(row[col]);
    }
  }
});

// 輸出成新 Excel
const newSheet = XLSX.utils.json_to_sheet(output);
const newWorkbook = XLSX.utils.book_new();

XLSX.utils.book_append_sheet(newWorkbook, newSheet, "cleaned");

XLSX.writeFile(newWorkbook, "cleaned_output_gemini3.xlsx");

console.log("✅ 完成！輸出 cleaned_output_gemini3.xlsx");
