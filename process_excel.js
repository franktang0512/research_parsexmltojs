const XLSX = require("xlsx");
const fs = require("fs");

// 讀你的 Excel
const workbook = XLSX.readFile("output_newtp.xlsx");
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
      sid,
      qid,
      score,

      abstraction: getScore(CT, "Abstraction"),
      decomposition: getScore(CT, "Decomposition"),
      pattern: getScore(CT, "Pattern"),
      generalization: getScore(CT, "Generalization"),
      algorithm: getScore(CT, "Algorithm"),

      applying: getScore(HOT, "Applying"),
      analyzing: getScore(HOT, "Analyzing"),
      evaluating: getScore(HOT, "Evaluating"),
      creating: getScore(HOT, "Creating"),

      解題分析: analysis
    };

    output.push(newRow);

  } catch (err) {
    console.log("Error at row", idx, err);
  }
});

// 輸出成新 Excel
const newSheet = XLSX.utils.json_to_sheet(output);
const newWorkbook = XLSX.utils.book_new();

XLSX.utils.book_append_sheet(newWorkbook, newSheet, "cleaned");

XLSX.writeFile(newWorkbook, "cleaned_output.xlsx");

console.log("✅ 完成！輸出 cleaned_output.xlsx");