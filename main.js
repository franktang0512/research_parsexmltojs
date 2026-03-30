const fs = require("fs"); 
const XLSX = require("xlsx"); 
const { xmlToJs, runJS } = require("./run");

// ===== 🔥 log系統（新增）=====
const logStream = fs.createWriteStream("log.txt", { flags: "w" });
function log(...args) {
  console.log(...args);
  logStream.write(args.join(" ") + "\n");
}

// ===== 🔥 完全忽略 whitespace =====
function normalize(str) {
  return String(str).replace(/\s+/g, "");
}

// ===== 🔥 單一模式評測 =====
function judgeWithMode(js, task, mode) {
  let totalScore = 0;
  let maxScore = 0;

  for (const group of task.cases) {
    log(`\n📦 模式: ${mode} | 測試群組: ${group.group_title}`);

    for (const c of group.subcase) {
      const input = c.input;
      const expectedRaw = c.output;
      const expected = normalize(expectedRaw);
      const score = Number(c.score);

      maxScore += score;

      let outputRaw = "";
      let errorMsg = "";

      try {
        outputRaw = runJS(js, input, mode);
      } catch (e) {
        outputRaw = "// ERROR";
        errorMsg = e.message;
      }

      const output = normalize(outputRaw);
      const isCorrect = output === expected;

      // ===== debug =====
      log("\n----------------------");
      log(`🧪 Case ${c.case_title}`);
      log(`input:           ${input}`);
      log(`expected(raw):   ${JSON.stringify(expectedRaw)}`);
      log(`output(raw):     ${JSON.stringify(outputRaw)}`);
      log(`expected(clean): ${expected}`);
      log(`output(clean):   ${output}`);
      if (errorMsg) log(`⚠️ ERROR: ${errorMsg}`);
      log(isCorrect ? "✅ CORRECT" : "❌ WRONG");

      if (isCorrect) totalScore += score;
    }
  }

  return { totalScore, maxScore };
}

// ===== 讀 Excel =====
// const wb = XLSX.readFile("filter grade_example.xlsx");
const wb = XLSX.readFile("filter grade_newtp.xlsx");
const sheet = wb.Sheets["Sheet1"];
const data = XLSX.utils.sheet_to_json(sheet);

let results = [];

log("=== Batch Judge Start ===");

for (const row of data) {
  const sid = String(row["學生ID"]);
  const qid = String(row["題目ID"]);
  const sub = String(row["繳交第幾次"]);

  log("\n======================");
  log("學生:", sid, "題目:", qid, "第幾次:", sub);

  // const folder = "1";//example
  const folder = "27"; //newtp

  // ===== XML 路徑（不要改）=====
  const xmlPath = `./${folder}/${sid}-${qid}-${sub}.xml`;

  // ===== JS 輸出資料夾 =====
  const jsDir = `./${folder}/js`;

  // 建立資料夾
  if (!fs.existsSync(jsDir)) {
    fs.mkdirSync(jsDir);
  }

  let js = "";
  let tokenScore = 0;
  let lineScore = 0;
  let validation = "錯誤";

  if (!fs.existsSync(xmlPath)) {
    log("❌ XML 不存在:", xmlPath);
  } else {
    const xml = fs.readFileSync(xmlPath, "utf-8");
    js = xmlToJs(xml);

    // ===== 🔥 存完整 JS（不經 Excel）=====
    const jsPath = `${jsDir}/${sid}-${qid}-${sub}.js`;
    fs.writeFileSync(jsPath, js, "utf-8");

    // ===== 🔥 印出學生程式 =====
    log("\n🧠 ===== Generated JS =====");
    log(js);
    log("🧠 ======================\n");

    // const taskPath = `./questions_example/${qid}/task.json`;
    const taskPath = `./questions_newtp/${qid}/task.json`;

    if (!fs.existsSync(taskPath)) {
      log("❌ 找不到 task:", taskPath);
    } else {
      const task = JSON.parse(fs.readFileSync(taskPath, "utf-8"));

      log("\n🚀 === TOKEN MODE ===");
      const tokenResult = judgeWithMode(js, task, "token");

      log("\n🚀 === LINE MODE ===");
      const lineResult = judgeWithMode(js, task, "line");

      tokenScore = tokenResult.totalScore;
      lineScore = lineResult.totalScore;

      log("\n📊 === Mode Score Summary ===");
      log(`TOKEN: ${tokenScore} / ${tokenResult.maxScore}`);
      log(`LINE : ${lineScore} / ${lineResult.maxScore}`);
    }
  }

  const originalScore = Number(row["分數"] || 0);

  if (originalScore === tokenScore || originalScore === lineScore) {
    validation = "OK";
  } else {
    validation = "錯誤";
  }

  log(`👉 系統分數: ${originalScore}`);
  log(`👉 TOKEN分數: ${tokenScore}`);
  log(`👉 LINE分數: ${lineScore}`);
  log(`👉 驗證: ${validation}`);

  // ===== 🔥 Excel 不再存 JS，只存路徑 =====
  const jsPath = `${folder}/js/${sid}-${qid}-${sub}.js`;

  results.push({
    "繳交流水號": row["繳交流水號"],
    "學生ID": sid,
    "題目ID": qid,
    "繳交第幾次": sub,
    "分數": row["分數"],
    "使用程式": row["使用程式"],
    "繳交時間": row["繳交時間"],
    "TOKEN分數": tokenScore,
    "LINE分數": lineScore,
    "驗證分數": validation,
    "JS路徑": jsPath
  });
}

// ===== 輸出 Excel =====
const outSheet = XLSX.utils.json_to_sheet(results);

Object.keys(outSheet).forEach(cell => {
  if (cell[0] === '!') return;
  if (outSheet[cell].v && typeof outSheet[cell].v === "string") {
    outSheet[cell].s = { alignment: { wrapText: true } };
  }
});

const outWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(outWb, outSheet, "Result");

XLSX.writeFile(outWb, "output.xlsx");

log("\n=== DONE ===");
log("📄 已輸出 output.xlsx");