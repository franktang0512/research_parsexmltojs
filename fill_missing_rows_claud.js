const XLSX = require("xlsx");

const INPUT_FILE = "cleaned_output_claud.xlsx";
const OUTPUT_FILE = "completed_dataset_preserve_na_claud.xlsx";

const ALL_SIDS = Array.from({ length: 529 - 440 + 1 }, (_, i) => 440 + i);

const ZERO_COLS = [
  "score",
  "abstraction",
  "decomposition",
  "generalization",
  "algorithm",
  "applying",
  "analyzing",
];

const NA_COLS = [
  "pattern",
  "evaluating",
  "creating",
];

const NUMERIC_COLS = [
  "sid",
  "qid",
  "score",
  "abstraction",
  "decomposition",
  "generalization",
  "algorithm",
  "applying",
  "analyzing",
];

const EMPTY_COLS = [
  "analysis",
];

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

const workbook = XLSX.readFile(INPUT_FILE);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

if (rows.length === 0) {
  throw new Error("Excel has no data");
}

const headers = Object.keys(rows[0]);
const sidCol = headers.find((c) => c.toLowerCase() === "sid");
const qidCol = headers.find((c) => c.toLowerCase() === "qid");

if (!sidCol || !qidCol) {
  throw new Error(`Could not find sid/qid columns: ${headers.join(", ")}`);
}

const allQids = [...new Set(
  rows
    .map((r) => r[qidCol])
    .filter((v) => v !== null && v !== undefined && v !== "")
)].sort((a, b) => {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return String(a).localeCompare(String(b), "zh-Hant");
});

const existing = new Map();
for (const row of rows) {
  row[sidCol] = normalizeNumericValue(row[sidCol]);
  row[qidCol] = normalizeNumericValue(row[qidCol]);

  for (const col of ZERO_COLS) {
    if (Object.prototype.hasOwnProperty.call(row, col)) {
      row[col] = normalizeNumericValue(row[col]);
    }
  }

  const key = `${row[sidCol]}__${row[qidCol]}`;
  existing.set(key, row);
}

const output = [];
let addedCount = 0;

for (const sid of ALL_SIDS) {
  for (const qid of allQids) {
    const key = `${sid}__${qid}`;

    if (existing.has(key)) {
      output.push(existing.get(key));
      continue;
    }

    const newRow = {};
    for (const header of headers) {
      newRow[header] = null;
    }

    newRow[sidCol] = sid;
    newRow[qidCol] = normalizeNumericValue(qid);

    for (const col of ZERO_COLS) {
      if (headers.includes(col)) newRow[col] = 0;
    }

    for (const col of NA_COLS) {
      if (headers.includes(col)) newRow[col] = "NA";
    }

    for (const col of EMPTY_COLS) {
      if (headers.includes(col)) newRow[col] = "";
    }

    output.push(newRow);
    addedCount++;
  }
}

for (const row of output) {
  for (const col of NUMERIC_COLS) {
    if (Object.prototype.hasOwnProperty.call(row, col)) {
      row[col] = normalizeNumericValue(row[col]);
    }
  }
}

output.sort((a, b) => {
  const sidA = Number(a[sidCol]);
  const sidB = Number(b[sidCol]);
  if (sidA !== sidB) return sidA - sidB;

  const qidA = Number(a[qidCol]);
  const qidB = Number(b[qidCol]);
  if (!Number.isNaN(qidA) && !Number.isNaN(qidB)) return qidA - qidB;

  return String(a[qidCol]).localeCompare(String(b[qidCol]), "zh-Hant");
});

const outSheet = XLSX.utils.json_to_sheet(output, { header: headers });
const outBook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(outBook, outSheet, "completed");
XLSX.writeFile(outBook, OUTPUT_FILE);

console.log(`Done. Wrote ${OUTPUT_FILE}`);
console.log(`Original rows: ${rows.length}`);
console.log(`Added rows: ${addedCount}`);
console.log(`Final rows: ${output.length}`);
