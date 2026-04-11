require("dotenv").config();
const fs = require("fs");
const XLSX = require("xlsx");
const OpenAI = require("openai");

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// ===== 檔案 =====
const FILE_PATH = "output_newtp.xlsx";
const LOG_PATH = "log.txt";
const BACKUP_PATH = "backup_gpt.jsonl";

// ===== rubric =====
const RUBRIC = fs.readFileSync("./rubric.txt", "utf-8");

// ===== log function =====
function log(...args) {
    const msg = args.join(" ");
    console.log(msg);
    fs.appendFileSync(LOG_PATH, msg + "\n");
}

// ===== 讀 Excel =====
let wb = XLSX.readFile(FILE_PATH);
let sheetName = "Result";
let ws = wb.Sheets[sheetName];

// 👉 轉 JSON
let data = XLSX.utils.sheet_to_json(ws);

// 👉 確保欄位存在
for (let i = 0; i < data.length; i++) {
    if (!("AI狀態" in data[i])) data[i]["AI狀態"] = "";
    if (!("AI結果" in data[i])) data[i]["AI結果"] = "";
}

// ===== observability =====
function buildObservabilityText(qid) {
    const obsPath = `./questions_newtp/${qid}/observability.json`;

    if (!fs.existsSync(obsPath)) return "";

    const obs = JSON.parse(fs.readFileSync(obsPath, "utf-8"));

    return `
【題目評量向度說明】
- 可評向度：${obs.allowed.join(", ") || "無"}
- 條件式評分：${obs.conditional.join(", ") || "無"}
- 不適用（原則 NA）：${obs.not_applicable.join(", ") || "無"}
`;
}

// ===== 存 Excel（穩定版）=====
function saveExcel() {
    const newSheet = XLSX.utils.json_to_sheet(data);
    wb.Sheets[sheetName] = newSheet;
    XLSX.writeFile(wb, FILE_PATH);
}

// ===== 主程式 =====
async function run() {

    for (let i = 0; i < data.length; i++) {

        const row = data[i];

        const sid = row["學生ID"];
        const qid = row["題目ID"];
        const jsPath = row["JS路徑"];

        log("\n=====================");
        log("學生:", sid, "題目:", qid);

        // 👉 已完成跳過
        if (row["AI狀態"] === "done") {
            log("⏭️ 已完成，跳過");
            continue;
        }

        // ===== JS 檢查 =====
        if (!fs.existsSync(jsPath)) {
            log("❌ 找不到JS");

            row["AI狀態"] = "error_no_js";
            saveExcel();
            continue;
        }

        const code = fs.readFileSync(jsPath, "utf-8");

        // ===== 題目 =====
        const taskPath = `./questions_newtp/${qid}/task.json`;

        if (!fs.existsSync(taskPath)) {
            log("❌ 找不到題目");

            row["AI狀態"] = "error_no_task";
            saveExcel();
            continue;
        }

        const task = JSON.parse(fs.readFileSync(taskPath, "utf-8"));
        const obsText = buildObservabilityText(qid);

        const prompt = `
${RUBRIC}

【題目資料】
${JSON.stringify(task)}

${obsText}

【學生程式】
${code}
`;

        try {
            const response = await client.responses.create({
                model: "gpt-5.4-mini",
                input: prompt
            });

            const output = response.output_text.trim();

            log("\n🧠 GPT OUTPUT:");
            log(output);

            let parsed = null;

            try {
                parsed = JSON.parse(output);
            } catch (e) {
                log("❌ JSON parse error");

                row["AI狀態"] = "error_json";
                row["AI結果"] = output;

                saveExcel();
                continue;
            }

            // ===== 成功 =====
            row["AI狀態"] = "done";
            row["AI結果"] = JSON.stringify(parsed);

            // 🔥 backup（最重要）
            fs.appendFileSync(BACKUP_PATH, JSON.stringify({
                sid,
                qid,
                result: parsed
            }) + "\n");

            log("✅ 完成");

            saveExcel();

        } catch (err) {

            log("❌ API錯誤:", err.message);

            row["AI狀態"] = "error_api";
            saveExcel();

            if (err.message.includes("quota")) {
                log("💸 額度不足，停止");
                break;
            }

            continue;
        }
        // break;
    }

    log("\n🎉 DONE");
}

run();