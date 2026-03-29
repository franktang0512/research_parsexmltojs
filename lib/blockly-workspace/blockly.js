const Blockly = require("blockly");
const { javascriptGenerator, Order } = require("blockly/javascript");

// 🔥 初始化 generator（OJ用）
function initializeBlockly() {
  const originalInit = javascriptGenerator.init;

  javascriptGenerator.init = function (workspace) {
    originalInit.call(this, workspace);

    // 確保 output 變數存在（只宣告一次）
    javascriptGenerator.provideFunction_(
      "init_output_result_string",
      "var output_result_string = '';\n"
    );
  };

  // 🔥 print → output_result_string
  javascriptGenerator.forBlock["text_print"] = function (block) {
    const msg =
      javascriptGenerator.valueToCode(block, "TEXT", Order.NONE) || "''";

    return `output_result_string += ${msg} + '\\n';\n`;
  };
}

// （可有可無，但保留）
const initialBlocklyWorkspace = {
  blocks: {
    blocks: [],
  },
};

module.exports = {
  initializeBlockly,
  initialBlocklyWorkspace,
};