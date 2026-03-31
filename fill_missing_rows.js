const XLSX = require("xlsx");

// ====== 你可以改的設定 ======
const INPUT_FILE = "cleaned_output.xlsx";
const OUTPUT_FILE = "completed_dataset_preserve_na.xlsx";

// sid 範圍
const ALL_SIDS = Array.from({ length: 529 - 440 + 1 }, (_, i) => 440 + i);

// 這些欄位在「補出的新 row」中填 0
const ZERO_COLS = [
  "score",
  "abstraction",
  "decomposition",
  "generalization",
  "algorithm",
  "applying",
  "analyzing",
];

// 這些欄位在「補出的新 row」中填 "NA"
const NA_COLS = [
  "pattern",
  "evaluating",
  "creating",
];

// 這些欄位在「補出的新 row」中填空字串
const EMPTY_COLS = [
  "解題分析",
];

// ====== 讀檔 ======
const workbook = XLSX.readFile(INPUT_FILE);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

if (rows.length === 0) {
  throw new Error("Excel 沒有資料");
}

// ====== 自動抓欄位名稱 ======
const headers = Object.keys(rows[0]);

const sidCol = headers.find(c => c.toLowerCase() === "sid" || c.includes("學生id") || c.includes("學生ID"));
const qidCol = headers.find(c => c.toLowerCase() === "qid" || c.includes("題目id") || c.includes("題目ID"));

if (!sidCol || !qidCol) {
  throw new Error(`找不到 sid/qid 欄位。現有欄位：${headers.join(", ")}`);
}

// ====== 取得所有 qid ======
const allQids = [...new Set(
  rows
    .map(r => r[qidCol])
    .filter(v => v !== null && v !== undefined && v !== "")
)].sort((a, b) => {
  // 若是數字就數字排序，否則字串排序
  const na = Number(a), nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return String(a).localeCompare(String(b), "zh-Hant");
});

// ====== 建立現有 key ======
const existing = new Map();
for (const row of rows) {
  const key = `${row[sidCol]}__${row[qidCol]}`;
  existing.set(key, row);
}

// ====== 補齊缺的 row ======
const output = [];
let addedCount = 0;

for (const sid of ALL_SIDS) {
  for (const qid of allQids) {
    const key = `${sid}__${qid}`;

    if (existing.has(key)) {
      // 原本有資料：完全保留
      output.push(existing.get(key));
    } else {
      // 原本沒資料：建立新 row
      const newRow = {};

      // 先把所有欄位建出來，避免漏欄
      for (const h of headers) {
        newRow[h] = null;
      }

      newRow[sidCol] = sid;
      newRow[qidCol] = qid;

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
}

// ====== 排序 ======
output.sort((a, b) => {
  const sidA = Number(a[sidCol]);
  const sidB = Number(b[sidCol]);
  if (sidA !== sidB) return sidA - sidB;

  const qa = Number(a[qidCol]);
  const qb = Number(b[qidCol]);
  if (!Number.isNaN(qa) && !Number.isNaN(qb)) return qa - qb;

  return String(a[qidCol]).localeCompare(String(b[qidCol]), "zh-Hant");
});

// ====== 輸出 ======
const outSheet = XLSX.utils.json_to_sheet(output, { header: headers });
const outBook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(outBook, outSheet, "completed");
XLSX.writeFile(outBook, OUTPUT_FILE);

console.log(`完成：${OUTPUT_FILE}`);
console.log(`原始列數：${rows.length}`);
console.log(`補上的列數：${addedCount}`);
console.log(`總列數：${output.length}`);
console.log(`題目數：${allQids.length}`);
console.log(`學生數：${ALL_SIDS.length}`);