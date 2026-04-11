require("dotenv").config();
const fs = require("fs");
const XLSX = require("xlsx");
const OpenAI = require("openai");

const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
        "HTTP-Referer": "http://localhost",
        "X-OpenRouter-Title": "xmltojstoexcel_newtp"
    }
});

// ===== 檔案 =====
const FILE_PATH = "output_newtp.xlsx";
const LOG_PATH = "log_openrouter.txt";
const BACKUP_PATH = "backup_openrouter.jsonl";

// ===== 參數 =====
// const MODEL_NAME = "anthropic/claude-sonnet-4";
// const MODEL_NAME = "google/gemini-2.0-flash-001";
const MODEL_NAME = "google/gemini-3-flash-preview";
// const MODEL_NAME = "anthropic/claude-haiku-4.5";

const MAX_RETRIES = 5;
const REQUEST_GAP_MS = 3000;
const TEST_LIMIT = null; // 測試先跑前 3 筆；正式全跑改成 null

// ===== rubric =====
const RUBRIC = fs.readFileSync("./rubric.txt", "utf-8");

// ===== log =====
function log(...args) {
    const msg = args.join(" ");
    console.log(msg);
    fs.appendFileSync(LOG_PATH, msg + "\n");
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== 清理模型輸出的 Markdown code fence =====
function cleanJsonOutput(text) {
    if (!text) return "";
    return text
        .replace(/^\s*```[\w-]*\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
}

// ===== 讀 Excel =====
let wb = XLSX.readFile(FILE_PATH);
const sheetName = "Result";
let ws = wb.Sheets[sheetName];
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
- 可評向度：${(obs.allowed || []).join(", ") || "無"}
- 條件式評分：${(obs.conditional || []).join(", ") || "無"}
- 不適用（原則 NA）：${(obs.not_applicable || []).join(", ") || "無"}
`;
}

// ===== 存 Excel（避免 EBUSY）=====
async function saveExcelWithRetry() {
    const maxSaveRetries = 5;

    for (let attempt = 1; attempt <= maxSaveRetries; attempt++) {
        try {
            const newSheet = XLSX.utils.json_to_sheet(data);
            wb.Sheets[sheetName] = newSheet;
            XLSX.writeFile(wb, FILE_PATH);
            return;
        } catch (err) {
            const msg = String(err.message || "");
            log(`⚠️ 存 Excel 失敗 attempt ${attempt}/${maxSaveRetries}: ${msg}`);

            if (!msg.includes("EBUSY") || attempt === maxSaveRetries) {
                throw err;
            }

            log("⏳ Excel 檔案被占用，3 秒後重試...");
            await sleep(3000);
        }
    }
}

// ===== 驗證 =====
function normalizeScore(v) {
    if (v === "NA") return "NA";

    if (typeof v === "number") {
        if (Number.isInteger(v) && v >= 0 && v <= 5) return v;
    }

    if (typeof v === "string") {
        const s = v.trim();
        if (s === "NA") return "NA";

        const n = Number(s);
        if (Number.isInteger(n) && n >= 0 && n <= 5) return n;
    }

    throw new Error(`非法 score: ${JSON.stringify(v)}`);
}

function validateParsed(parsed) {
    const ctKeys = ["Abstraction", "Decomposition", "Pattern", "Generalization", "Algorithm"];
    const hotKeys = ["Applying", "Analyzing", "Evaluating", "Creating"];

    if (!parsed || typeof parsed !== "object") {
        throw new Error("parsed 非物件");
    }

    if (typeof parsed.analysis !== "string") {
        throw new Error("analysis 非字串");
    }

    if (!parsed.CT || typeof parsed.CT !== "object") {
        throw new Error("缺少 CT");
    }

    if (!parsed.HOT || typeof parsed.HOT !== "object") {
        throw new Error("缺少 HOT");
    }

    for (const k of ctKeys) {
        if (!parsed.CT[k]) throw new Error(`缺少 CT.${k}`);
        parsed.CT[k].score = normalizeScore(parsed.CT[k].score);
        if (typeof parsed.CT[k].reason !== "string") {
            throw new Error(`CT.${k}.reason 非字串`);
        }
    }

    for (const k of hotKeys) {
        if (!parsed.HOT[k]) throw new Error(`缺少 HOT.${k}`);
        parsed.HOT[k].score = normalizeScore(parsed.HOT[k].score);
        if (typeof parsed.HOT[k].reason !== "string") {
            throw new Error(`HOT.${k}.reason 非字串`);
        }
    }

    return parsed;
}

// ===== retryable error 判斷 =====
function isRetryableError(err) {
    const msg = String(err?.message || "").toLowerCase();
    return (
        msg.includes("429") ||
        msg.includes("500") ||
        msg.includes("502") ||
        msg.includes("503") ||
        msg.includes("504") ||
        msg.includes("overloaded") ||
        msg.includes("timeout") ||
        msg.includes("rate limit") ||
        msg.includes("network")
    );
}

// ===== 建 prompt =====
function buildPrompt(task, obsText, code) {
    return `
${RUBRIC}

【題目資料】
${JSON.stringify(task)}

${obsText}

【學生程式】
${code}

【補充要求】
- 只輸出有效 JSON。
- 不要輸出 Markdown code fence。
- 不要輸出任何 JSON 以外的說明文字。
`;
}

// ===== OpenRouter 呼叫 =====
async function callOpenRouterWithRetry(prompt, sid, qid) {
    let lastError = null;
    const retryDelays = [5000, 10000, 20000, 30000, 45000];

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            log(`📨 呼叫 OpenRouter... attempt ${attempt}/${MAX_RETRIES} | 學生 ${sid} 題目 ${qid}`);

            const response = await client.chat.completions.create({
                model: MODEL_NAME,
                messages: [
                    {
                        role: "system",
                        content: "你是嚴格的學術研究程式分析評分者。你必須只輸出純 JSON，不可加入任何說明文字、不可加入 Markdown、不可加入 ```。"
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.2
            });

            let output = (response.choices?.[0]?.message?.content || "").trim();
            output = cleanJsonOutput(output);

            if (!output) {
                throw new Error("空回應");
            }

            return output;
        } catch (err) {
            lastError = err;
            const retryable = isRetryableError(err);

            log(`⚠️ OpenRouter 呼叫失敗 attempt ${attempt}: ${err.message}`);

            if (!retryable || attempt === MAX_RETRIES) {
                break;
            }

            const delay = retryDelays[attempt - 1] || 60000;
            log(`⏳ ${delay}ms 後重試...`);
            await sleep(delay);
        }
    }

    throw lastError;
}

// ===== 主程式 =====
async function run() {
    log("🚀 開始執行");

    for (let i = 0; i < data.length; i++) {
        if (TEST_LIMIT !== null && i >= TEST_LIMIT) {
            log(`🧪 測試模式：已跑完前 ${TEST_LIMIT} 筆，停止`);
            break;
        }

        const row = data[i];
        const sid = row["學生ID"];
        const qid = row["題目ID"];
        const jsPath = row["JS路徑"];

        log("\n=====================");
        log("學生:", sid, "題目:", qid);

        if (row["AI狀態"] === "done") {
            log("⏭️ 已完成，跳過");
            continue;
        }

        // ===== JS 檢查 =====
        if (!jsPath || !fs.existsSync(jsPath)) {
            log("❌ 找不到JS");
            row["AI狀態"] = "error_no_js";
            row["AI結果"] = "";
            await saveExcelWithRetry();
            continue;
        }

        const code = fs.readFileSync(jsPath, "utf-8");

        // ===== 題目 =====
        const taskPath = `./questions_newtp/${qid}/task.json`;

        if (!fs.existsSync(taskPath)) {
            log("❌ 找不到題目");
            row["AI狀態"] = "error_no_task";
            row["AI結果"] = "";
            await saveExcelWithRetry();
            continue;
        }

        const task = JSON.parse(fs.readFileSync(taskPath, "utf-8"));
        const obsText = buildObservabilityText(qid);
        const prompt = buildPrompt(task, obsText, code);

        try {
            const output = await callOpenRouterWithRetry(prompt, sid, qid);

            log("\n🧠 OPENROUTER OUTPUT:");
            log(output);

            let parsed = null;

            try {
                parsed = JSON.parse(output);
                parsed = validateParsed(parsed);
            } catch (e) {
                log("❌ JSON parse / validate error:", e.message);

                row["AI狀態"] = "error_json";
                row["AI結果"] = output;
                await saveExcelWithRetry();
                await sleep(REQUEST_GAP_MS);
                continue;
            }

            row["AI狀態"] = "done";
            row["AI結果"] = JSON.stringify(parsed);

            fs.appendFileSync(
                BACKUP_PATH,
                JSON.stringify({
                    sid,
                    qid,
                    result: parsed
                }) + "\n"
            );

            log("✅ 完成");
            await saveExcelWithRetry();

        } catch (err) {
            log("❌ API錯誤:", err.message);

            const msg = String(err.message || "").toLowerCase();

            if (
                msg.includes("quota") ||
                msg.includes("billing") ||
                msg.includes("permission") ||
                msg.includes("api key") ||
                msg.includes("authentication") ||
                msg.includes("insufficient credits")
            ) {
                row["AI狀態"] = "error_api_fatal";
                await saveExcelWithRetry();
                log("🛑 致命 API 問題，停止");
                break;
            }

            row["AI狀態"] = "error_api";
            await saveExcelWithRetry();
            await sleep(REQUEST_GAP_MS);
            continue;
        }

        await sleep(REQUEST_GAP_MS);
    }

    log("\n🎉 DONE");
}

run().catch(err => {
    log("💥 程式最外層錯誤:", err.stack || err.message);
});