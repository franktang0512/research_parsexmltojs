// ===== 🔥 1️⃣ Fake DOM（Blockly 需要）=====
global.document = {
  createElement: () => ({
    setAttribute: () => {},
    appendChild: () => {},
  }),
};
global.window = {};
global.navigator = {};

const { JSDOM } = require("jsdom");

const dom = new JSDOM("");
global.window = dom.window;
global.document = dom.window.document;
global.DOMParser = dom.window.DOMParser;
global.XMLSerializer = dom.window.XMLSerializer;

// ===== 🔥 2️⃣ 載入 Blockly =====
const Blockly = require("blockly");
require("blockly/javascript");

const vm = require("vm");

// ===== 🔥 3️⃣ 載入自訂 block =====
const { initializeScratch } = require("./lib/blockly-workspace/scratch.js");
require("./lib/blockly-workspace/blockly.js");

initializeScratch(); // ⭐ 必須

const { javascriptGenerator } = require("blockly/javascript");

// ===== XML → JS =====
function xmlToJs(xmlText) {
  const workspace = new Blockly.Workspace();

  const dom = Blockly.utils.xml.textToDom(xmlText);
  Blockly.Xml.domToWorkspace(dom, workspace);

  return javascriptGenerator.workspaceToCode(workspace);
}

// ===== 🔥 執行 JS（支援 token / line）=====
function runJS(js_code, input_data, mode = "token") {
  let inputs = [];

  // ===== 🎯 input parsing（核心）=====
  if (mode === "token") {
    // 空白 / tab / 換行 → token
    inputs = String(input_data)
      .split(/\s+/)
      .filter((i) => i.length > 0);
  } else {
    // 每一行 → 一個輸入
    inputs = String(input_data)
      .split(/\r?\n/)
      .map((i) => i.trim())
      .filter((i) => i.length > 0);
  }

  let idx = 0;

  function prompt() {
    return inputs[idx++] ?? "";
  }

  // ===== 🔥 sandbox（模擬瀏覽器）=====
  let sandbox = {
    prompt,
    getInput: prompt, // Scratch 用

    output_result_string: "",

    // 👉 支援 alert
    alert: (msg) => {
      sandbox.output_result_string += msg + "\n";
    },

    // 👉 支援 window.*
    window: {
      prompt,
      alert: (msg) => {
        sandbox.output_result_string += msg + "\n";
      },
    },

    // 👉（可選）console.log 也當輸出
    console: {
      log: (...args) => {
        sandbox.output_result_string += args.join(" ") + "\n";
      },
    },
  };

  try {
    const script = new vm.Script(js_code);
    const context = vm.createContext(sandbox);

    script.runInContext(context, {
      timeout: 1000, // 防 infinite loop
    });

    return sandbox.output_result_string;
  } catch (e) {
    return "// ERROR: " + e.message;
  }
}

module.exports = { xmlToJs, runJS };