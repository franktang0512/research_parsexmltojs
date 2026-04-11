require("dotenv").config();
const fs = require("fs");
const XLSX = require("xlsx");
const { GoogleGenAI, Type } = require("@google/genai");

const client = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// ===== 檔案 =====
const FILE_PATH = "output_newtp.xlsx";
const LOG_PATH = "log_gemini.txt";
const BACKUP_PATH = "backup_gemini.jsonl";

// ===== 參數 =====
const MODEL_NAME = "gemini-2.5-flash";
const MAX_RETRIES = 6;
const REQUEST_GAP_MS = 3000; // 每筆之間停 3 秒，降低 503 機率
const TEST_LIMIT = 3; // 先測前 3 筆；正式跑全部時改成 null

// ===== rubric =====
const RUBRIC = fs.readFileSync("./rubric.txt", "utf-8");

// ===== log function =====
function log(...args) {
    const msg = args.join(" ");
    console.log(msg);
    fs.appendFileSync(LOG_PATH, msg + "\n");
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== 讀 Excel =====
let wb = XLSX.readFile(FILE_PATH);
const sheetName = "Result";
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
- 可評向度：${(obs.allowed || []).join(", ") || "無"}
- 條件式評分：${(obs.conditional || []).join(", ") || "無"}
- 不適用（原則 NA）：${(obs.not_applicable || []).join(", ") || "無"}
`;
}

// ===== 存 Excel =====
function saveExcel() {
    const newSheet = XLSX.utils.json_to_sheet(data);
    wb.Sheets[sheetName] = newSheet;
    XLSX.writeFile(wb, FILE_PATH);
}

// ===== schema =====
const scoreSchema = {
    anyOf: [
        { type: Type.INTEGER },
        { type: Type.STRING }
    ]
};

function dimSchema() {
    return {
        type: Type.OBJECT,
        properties: {
            score: scoreSchema,
            reason: { type: Type.STRING }
        },
        required: ["score", "reason"]
    };
}

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        analysis: { type: Type.STRING },
        CT: {
            type: Type.OBJECT,
            properties: {
                Abstraction: dimSchema(),
                Decomposition: dimSchema(),
                Pattern: dimSchema(),
                Generalization: dimSchema(),
                Algorithm: dimSchema()
            },
            required: [
                "Abstraction",
                "Decomposition",
                "Pattern",
                "Generalization",
                "Algorithm"
            ]
        },
        HOT: {
            type: Type.OBJECT,
            properties: {
                Applying: dimSchema(),
                Analyzing: dimSchema(),
                Evaluating: dimSchema(),
                Creating: dimSchema()
            },
            required: [
                "Applying",
                "Analyzing",
                "Evaluating",
                "Creating"
            ]
        }
    },
    required: ["analysis", "CT", "HOT"]
};

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

// ===== API 呼叫（含 retry）=====
function isRetryableError(err) {
    const msg = String(err?.message || "").toLowerCase();
    return (
        msg.includes("503") ||
        msg.includes("unavailable") ||
        msg.includes("high demand") ||
        msg.includes("resource exhausted") ||
        msg.includes("rate limit") ||
        msg.includes("429") ||
        msg.includes("timeout")
    );
}

async function callGeminiWithRetry(prompt, sid, qid) {
    let lastError = null;
    const retryDelays = [5000, 10000, 20000, 30000, 45000, 60000];

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            log(`📨 呼叫 Gemini... attempt ${attempt}/${MAX_RETRIES} | 學生 ${sid} 題目 ${qid}`);

            const response = await client.models.generateContent({
                model: MODEL_NAME,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema,
                    temperature: 0.2,
                    maxOutputTokens: 2048
                }
            });

            const output = (response.text || "").trim();

            if (!output) {
                throw new Error("空回應");
            }

            return output;
        } catch (err) {
            lastError = err;
            const retryable = isRetryableError(err);

            log(`⚠️ Gemini 呼叫失敗 attempt ${attempt}: ${err.message}`);

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

// ===== 建 prompt =====
function buildPrompt(task, obsText, code) {
    return `
${RUBRIC}

【題目資料】
${JSON.stringify(task)}

${obsText}

【學生程式】
${code}
`;
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

        // 👉 已完成跳過
        if (row["AI狀態"] === "done") {
            log("⏭️ 已完成，跳過");
            continue;
        }

        // ===== JS 檢查 =====
        if (!jsPath || !fs.existsSync(jsPath)) {
            log("❌ 找不到JS");
            row["AI狀態"] = "error_no_js";
            row["AI結果"] = "";
            saveExcel();
            continue;
        }

        const code = fs.readFileSync(jsPath, "utf-8");

        // ===== 題目 =====
        const taskPath = `./questions_newtp/${qid}/task.json`;

        if (!fs.existsSync(taskPath)) {
            log("❌ 找不到題目");
            row["AI狀態"] = "error_no_task";
            row["AI結果"] = "";
            saveExcel();
            continue;
        }

        const task = JSON.parse(fs.readFileSync(taskPath, "utf-8"));
        const obsText = buildObservabilityText(qid);
        const prompt = buildPrompt(task, obsText, code);

        try {
            const output = await callGeminiWithRetry(prompt, sid, qid);

            log("\n🧠 GEMINI OUTPUT:");
            log(output);

            let parsed = null;

            try {
                parsed = JSON.parse(output);
                parsed = validateParsed(parsed);
            } catch (e) {
                log("❌ JSON parse / validate error:", e.message);

                row["AI狀態"] = "error_json";
                row["AI結果"] = output;
                saveExcel();
                await sleep(REQUEST_GAP_MS);
                continue;
            }

            // ===== 成功 =====
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
            saveExcel();

        } catch (err) {
            log("❌ API錯誤:", err.message);

            const msg = String(err.message || "").toLowerCase();

            if (
                msg.includes("quota") ||
                msg.includes("billing") ||
                msg.includes("permission") ||
                msg.includes("api key")
            ) {
                row["AI狀態"] = "error_api_fatal";
                saveExcel();
                log("🛑 致命 API 問題，停止");
                break;
            }

            row["AI狀態"] = "error_api";
            saveExcel();
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