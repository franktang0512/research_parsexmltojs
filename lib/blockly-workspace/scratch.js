const Blockly = require("blockly");
const { javascriptGenerator, Order } = require("blockly/javascript");

function initializeScratch() {

  Blockly.Blocks["event_whenflagclicked"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("當")
        .appendField(new Blockly.FieldImage("img/flag.svg", 20, 20, "*"))
        .appendField("被點擊");
      this.setNextStatement(true, null);
      this.setColour("#FFBF00");
      this.setTooltip("當旗子被點擊時觸發");
      this.setHelpUrl("");
    },
  };

  // 轉換「當綠旗被點擊」積木成 JavaScript 程式碼
  javascriptGenerator.forBlock["event_whenflagclicked"] = function (block) {
    // 取得「當綠旗被點擊」後面連接的程式碼
    // const nextBlockCode = javascriptGenerator.statementToCode(block, "NEXT");

    // 產生 JavaScript 函式，確保程式從這裡開始執行
    return "\n var output_result_string ='';";
  };
  Blockly.Blocks["scratch_text"] = {
    init: function () {
      this.appendDummyInput()
        .appendField(new Blockly.FieldTextInput(""), "TEXT"); // 🔹 預設值 HAHA
      this.setOutput(true, ["Number", "String"]); // 🔹 允許數字 & 文字
      this.setColour("#FFFFFF"); // 🔹 設定為白色，符合 Scratch 風格
    },
    // style: { hidden: true } // 🔹 讓這個積木不顯示在 Toolbox
  };

  javascriptGenerator.forBlock["scratch_text"] = function (block) {
    const textValue = block.getFieldValue("TEXT") || "";
    return [`"${textValue}"`, Order.ATOMIC];
  };

  Blockly.Blocks["event_askandwait"] = {
    init: function () {
      this.appendValueInput("TEXT")
        .setCheck(null)
        .appendField("詢問");
      this.appendDummyInput()
        .appendField("並等待");
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour("#5CB1D6");
      this.setTooltip("");
      this.setHelpUrl("");
    },
  };

  // javascriptGenerator.forBlock["event_askandwait"] = function (block) {
  //   var value_question = javascriptGenerator.valueToCode(block, 'TEXT', Order.ATOMIC) || "''";
  //   var code = `
  //   system_input = window.prompt(${value_question}) ?? "";\n
  //   system_input = system_input.toString();\n
  //   temp_input = system_input.toString().trim();
  //   if(temp_input === ""){
  //     if(system_input === " "){
  //       system_input = " "; 
  //     }else{
  //       system_input = "";
  //     }
  //   }else if (!isNaN(temp_input)) {  // 如果是數字字串，轉換為數字
  //       system_input = Number(temp_input);
  //   }else{
  //       system_input = temp_input;
  //   }
  //   `;
  //   return code;
  // };
  javascriptGenerator.forBlock["event_askandwait"] = function (block) {
    var value_question =
      javascriptGenerator.valueToCode(block, "TEXT", Order.ATOMIC) || "''";

    var code = `
  if (typeof getInput === "function") {
    system_input = getInput();
  } else {
    system_input = window.prompt(${value_question}) ?? "";
  }

  system_input = system_input.toString();
  var temp_input = system_input.trim();

  if (temp_input === "") {
    if (system_input === " ") {
      system_input = " ";
    } else {
      system_input = "";
    }
  } else if (!isNaN(temp_input)) {
    system_input = Number(temp_input);
  } else {
    system_input = temp_input;
  }
  `;

    return code;
  };



  // 定義積木：詢問的答案
  Blockly.Blocks["event_answer"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("詢問的答案");
      this.setInputsInline(true);
      this.setOutput(true, null);
      this.setColour("#5CB1D6");
      this.setTooltip("");
      this.setHelpUrl("");

    },
  };
  javascriptGenerator.forBlock["event_answer"] = function (block) {
    // TODO: Assemble JavaScript into code variable.
    var code = 'system_input';
    // TODO: Change ORDER_NONE to the correct strength.
    return [code, Order.ATOMIC];
  };



  Blockly.Blocks["event_say"] = {
    init: function () {
      this.appendValueInput("TEXT")
        .setCheck(null)
        .appendField("說出");
      this.appendDummyInput();
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour("#9966FF");
      this.setTooltip("");
      this.setHelpUrl("");
    },
  };
  javascriptGenerator.forBlock["event_say"] = function (block) {
    var msg = javascriptGenerator.valueToCode(block, 'TEXT', Order.NONE) || '\'\'';
    var code = 'output_result_string += ' + String(msg) + ';\n' + 'output_result_string += \'\\n\' ;\n'
    return code;
  };

  // 定義積木：沒有輸入資料
  Blockly.Blocks["event_noinput"] = {
    init: function () {
      this.appendDummyInput().appendField("沒有輸入資料");
      this.setOutput(true, "Boolean");
      this.setColour("#59C059");
      this.setTooltip("檢查是否沒有輸入資料");
      this.setHelpUrl("");
    },
  };

  javascriptGenerator.forBlock["event_noinput"] = function (block) {
    var code = "system_input=='NaN'";
    return [code, Order.ATOMIC];
  };

  // 定義積木：還有輸入資料
  Blockly.Blocks["event_hasinput"] = {
    init: function () {
      this.appendDummyInput().appendField("還有輸入資料");
      this.setOutput(true, "Boolean");
      this.setColour("#59C059");
      this.setTooltip("檢查是否還有輸入資料");
      this.setHelpUrl("");
    },
  };
  javascriptGenerator.forBlock["event_hasinput"] = function (block) {
    var code = "system_input!='NaN'";
    return [code, Order.ATOMIC];
  };

  [
    "scratch_param_player_x",
    "scratch_param_player_y",
    "scratch_param_coins_count",
    "scratch_param_max_x",
    "scratch_param_max_y",
  ].forEach((blockType) => {
    javascriptGenerator.forBlock[blockType] = function () {
      // Remove 'scratch_param_' and convert to camelCase
      const paramName = blockType
        .replace("scratch_param_", "")
        .replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      return [paramName + "()", Order.FUNCTION_CALL];
    };
  });
  [
    "scratch_param_coins_count_stone",
    "scratch_param_player_x_stone",
    "scratch_param_player_y_stone",
  ].forEach((blockType) => {
    javascriptGenerator.forBlock[blockType] = function () {
      return ""; // no code generation for these blocks
    };
  });

  Blockly.Blocks["scratch_string_join"] = {
    init: function () {

      this.appendValueInput("TEXT0")
        .setCheck(null)
        .appendField("字串組合");
      this.appendValueInput("TEXT1")
        .setCheck(null);
      this.setInputsInline(true);
      this.setOutput(true, "String");
      this.setColour("#36BF36");
      this.setTooltip("");
      this.setHelpUrl("");
    },
  };

  javascriptGenerator.forBlock["scratch_string_join"] = function (block) {

    var element0 = javascriptGenerator.valueToCode(block, "TEXT0", Order.ATOMIC) || '""';
    var element1 = javascriptGenerator.valueToCode(block, "TEXT1", Order.ATOMIC) || '""';

    var code = `String(${element0}) + String(${element1})`;
    return [code, Order.ADDITION];

  };

  Blockly.Blocks["scratch_string_char_at"] = {
    init: function () {
      this.appendValueInput("STRING").setCheck(null).appendField("字串");
      this.appendValueInput("INDEX").setCheck("Number").appendField("的第");
      this.appendDummyInput().appendField("字");
      this.setInputsInline(true);
      this.setOutput(true, "String");
      this.setStyle("calculation_blocks");
      this.setTooltip("取得字串中指定位置的字元");
    },
  };
  javascriptGenerator.forBlock["scratch_string_char_at"] = function (block) {
    const string =
      javascriptGenerator.valueToCode(block, "STRING", Order.MEMBER) || '""';
    const index =
      javascriptGenerator.valueToCode(block, "INDEX", Order.ATOMIC) || "1";

    return [`String(${string}).charAt(Number(${index}) - 1)`, Order.MEMBER];
  };

  Blockly.Blocks["scratch_string_contains"] = {
    init: function () {
      this.appendValueInput("STRING1").setCheck("String").appendField("字串");
      this.appendValueInput("STRING2").setCheck("String").appendField("包含");
      this.setInputsInline(true);
      this.setOutput(true, "Boolean");
      this.setStyle("calculation_blocks");
      this.setTooltip("檢查第一個字串是否包含第二個字串");
    },
  };

  javascriptGenerator.forBlock["scratch_string_contains"] = function (block) {
    const string1 =
      javascriptGenerator.valueToCode(block, "STRING1", Order.MEMBER) || "''";
    const string2 =
      javascriptGenerator.valueToCode(block, "STRING2", Order.ATOMIC) || "''";
    return [`${string1}.includes(${string2})`, Order.MEMBER];
  };

  Blockly.Blocks["scratch_if"] = {
    init: function () {
      this.appendValueInput("IF0").setCheck("Boolean").appendField("如果");
      this.appendDummyInput().appendField("那麼");
      this.appendStatementInput("DO0").setCheck(null);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle("control_blocks");
      this.setTooltip("如果條件成立，則執行內部的程式區塊");
      this.setHelpUrl("");
    },
  };

  javascriptGenerator.forBlock["scratch_if"] = function (block) {
    const condition =
      javascriptGenerator.valueToCode(block, "IF0", Order.NONE) || "false";
    const statements = javascriptGenerator.statementToCode(block, "DO0");
    return `if (${condition}) {\n${statements}}\n`;
  };

  Blockly.Blocks["scratch_ifElse"] = {
    init: function () {
      this.appendValueInput("IF0").setCheck("Boolean").appendField("如果");
      this.appendDummyInput().appendField("那麼");
      this.appendStatementInput("DO0").setCheck(null);
      this.appendDummyInput().appendField("否則");
      this.appendStatementInput("ELSE").setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle("control_blocks");
      this.setTooltip(
        "如果條件成立，則執行第一個程式區塊，否則執行第二個程式區塊"
      );
      this.setHelpUrl("");
    },
  };

  javascriptGenerator.forBlock["scratch_ifElse"] = function (block) {
    const condition =
      javascriptGenerator.valueToCode(block, "IF0", Order.NONE) || "false";
    const statements = javascriptGenerator.statementToCode(block, "DO0");
    const elseStatements = javascriptGenerator.statementToCode(block, "ELSE");
    return `if (${condition}) {\n${statements}} else {\n${elseStatements}}\n`;
  };

  Blockly.Blocks["scratch_repeat_ext"] = {
    init: function () {
      this.appendValueInput("TIMES").setCheck("Number").appendField("重複");
      this.appendDummyInput().appendField("次");
      this.appendStatementInput("DO").setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle("control_blocks");
      this.setTooltip("重複執行指定次數的程式區塊");
      this.setHelpUrl("");
    },
  };

  javascriptGenerator.forBlock["scratch_repeat_ext"] = function (block) {
    const times =
      javascriptGenerator.valueToCode(block, "TIMES", Order.ATOMIC) || "0";
    const statements = javascriptGenerator.statementToCode(block, "DO");
    return `for (let __internalCount = 0; __internalCount < ${times}; __internalCount++) {\n${statements}}\n`;
  };

  Blockly.Blocks["scratch_while"] = {
    init: function () {
      this.appendValueInput("BOOL")
        .setCheck("Boolean")
        .appendField("重複")
        .appendField(
          new Blockly.FieldDropdown([
            ["當", "WHILE"],
            ["直到", "UNTIL"],
          ]),
          "MODE"
        );
      this.appendStatementInput("DO").setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle("control_blocks");
      this.setTooltip("當條件成立時重複執行程式區塊");
      this.setHelpUrl("");
    },
  };

  javascriptGenerator.forBlock["scratch_while"] = function (block) {
    const mode = block.getFieldValue("MODE");
    const condition =
      javascriptGenerator.valueToCode(block, "BOOL", Order.NONE) || "false";
    const statements = javascriptGenerator.statementToCode(block, "DO");

    if (mode === "UNTIL") {
      return `while (!(${condition})) {\n${statements}}\n`;
    } else {
      return `while (${condition}) {\n${statements}}\n`;
    }
  };

  Blockly.Blocks["scratch_whileUntil"] = {
    init: function () {
      this.appendValueInput("BOOL")
        .setCheck("Boolean")
        .appendField("重複")
        .appendField(
          new Blockly.FieldDropdown([
            ["直到", "UNTIL"],
            ["當", "WHILE"],
          ]),
          "MODE"
        );
      this.appendStatementInput("DO").setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle("control_blocks");
      this.setTooltip("直到條件成立時停止重複執行程式區塊");
      this.setHelpUrl("");
    },
  };

  javascriptGenerator.forBlock["scratch_whileUntil"] = function (block) {
    const mode = block.getFieldValue("MODE");
    const condition =
      javascriptGenerator.valueToCode(block, "BOOL", Order.NONE) || "false";
    const statements = javascriptGenerator.statementToCode(block, "DO");

    if (mode === "UNTIL") {
      return `while (!(${condition})) {\n${statements}}\n`;
    } else {
      return `while (${condition}) {\n${statements}}\n`;
    }
  };

  Blockly.Blocks["scratch_controls_flow_statements"] = {
    init: function () {
      this.appendDummyInput().appendField(
        new Blockly.FieldDropdown([
          ["中斷循環", "BREAK"],
          ["繼續下一個循環", "CONTINUE"],
        ]),
        "FLOW",
      );
      this.setPreviousStatement(true, null);
      this.setNextStatement(false, null);
      this.setStyle("control_blocks");
      this.setTooltip("控制重複的執行流程");
    },
  };

  javascriptGenerator.forBlock["scratch_controls_flow_statements"] = function (
    block,
  ) {
    const flow = block.getFieldValue("FLOW");
    return flow === "BREAK" ? "break;\n" : "continue;\n";
  };




  Blockly.Blocks["scratch_math_arithmetic"] = {
    init: function () {
      this.appendValueInput("A")
        // .setCheck(["Number", "String"]);
        .setCheck("Number");
      this.appendValueInput("B")
        .setCheck("Number")
        .appendField(new Blockly.FieldDropdown([["+", "ADD"], ["-", "MINUS"], ["*", "MULTIPLY"], ["/", "DIVIDE"]]), "OP");
      this.setInputsInline(true);
      this.setOutput(true, "Number");
      this.setColour("#36BF36");
      this.setTooltip("");
      this.setHelpUrl("");
    },
  };



  javascriptGenerator.forBlock["scratch_math_arithmetic"] = function (block) {
    let a = javascriptGenerator.valueToCode(block, "A", Order.ATOMIC) || "0";
    let b = javascriptGenerator.valueToCode(block, "B", Order.ATOMIC) || "0";
    const operator = block.getFieldValue("OP");

    // **直接將 a, b 轉換為數字，若無法轉換則為 0**
    const numberA = `(isNaN(Number(${a})) ? 0 : Number(${a}))`;
    const numberB = `(isNaN(Number(${b})) ? 0 : Number(${b}))`;

    let code;
    switch (operator) {
      case "ADD":
        code = `${numberA} + ${numberB}`;
        break;
      case "MINUS":
        code = `${numberA} - ${numberB}`;
        break;
      case "MULTIPLY":
        code = `${numberA} * ${numberB}`;
        break;
      case "DIVIDE":
        code = `${numberB} !== 0 ? ${numberA} / ${numberB} : 0`;
        break;
      default:
        code = "0";
    }

    return [code, Order.ADDITION];
  };



  Blockly.Blocks["scratch_length"] = {
    init: function () {
      this.appendValueInput("VALUE")
        .setCheck(["String", "Array"])
        .appendField("取得");
      this.appendDummyInput().appendField("的長度");
      this.setInputsInline(true);
      this.setOutput(true, "Number");
      this.setStyle("calculation_blocks");
      this.setTooltip("計算字串或清單的長度");
      this.setHelpUrl("");
    },
  };
  javascriptGenerator.forBlock["scratch_length"] = function (block) {
    var value = javascriptGenerator.valueToCode(block, "VALUE", Order.MEMBER) || '""';

    return [`(Array.isArray(${value}) ? ${value}.length : String(${value}).length)`, Order.MEMBER];
  };
  Blockly.Blocks["scratch_variables_set"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("變數")
        .appendField(new Blockly.FieldVariable("", undefined, [""]), "VAR")
        .appendField("設為");

      const shadowBlock = document.createElement("shadow");
      shadowBlock.setAttribute("type", "scratch_text");
      const field = document.createElement("field");
      field.setAttribute("name", "TEXT");
      field.textContent = "0";
      shadowBlock.appendChild(field);

      this.appendValueInput("VALUE")
        .setCheck(null)
        .connection.setShadowDom(shadowBlock);

      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle("variable_blocks");
    },
  };

  javascriptGenerator.forBlock["scratch_variables_set"] = function (block) {
    const varName = javascriptGenerator.nameDB_?.getName(
      block.getFieldValue("VAR"),
      Blockly.VARIABLE_CATEGORY_NAME,
    );
    const value =
      javascriptGenerator.valueToCode(block, "VALUE", Order.ASSIGNMENT) || "0";

    // If it's a string literal, check if it's numeric
    if (value.startsWith('"') || value.startsWith("'")) {
      const strValue = value.slice(1, -1);
      if (!isNaN(parseFloat(strValue))) {
        return `${varName} = ${Number(strValue)};\n`;
      }
    }

    return `${varName} = ${value};\n`;
  };

  Blockly.Blocks["scratch_variables_change"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("變數")
        .appendField(new Blockly.FieldVariable("", undefined, [""]), "VAR")
        .appendField("改變");

      const valueInput = this.appendValueInput("DELTA").setCheck(null);

      const shadowBlock = document.createElement("shadow");
      shadowBlock.setAttribute("type", "math_number");
      const field = document.createElement("field");
      field.setAttribute("name", "NUM");
      field.textContent = "1";
      shadowBlock.appendChild(field);

      valueInput.connection.setShadowDom(shadowBlock);

      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle("variable_blocks");
    },
  };

  javascriptGenerator.forBlock["scratch_variables_change"] = function (block) {
    const varName = javascriptGenerator.nameDB_?.getName(
      block.getFieldValue("VAR"),
      Blockly.VARIABLE_CATEGORY_NAME,
    );
    const delta =
      javascriptGenerator.valueToCode(block, "DELTA", Order.ADDITION) || "1";
    return `${varName} = (typeof ${varName} == 'number' ? ${varName} : 0) + ${delta};\n`;
  };


  Blockly.Blocks["scratch_variables_get"] = {
    init: function () {
      this.appendDummyInput()
        .appendField(
          new Blockly.FieldVariable("變數名稱", undefined, [""]),
          "VAR")
      this.setStyle("variable_blocks");
      this.setInputsInline(true);
      this.setOutput(true, null);
      this.setColour("#FF9900");
      // this.setColour("%{BKY_VARIABLES_HUE}");
      this.setTooltip("");
      this.setHelpUrl("");

    },
  };

  javascriptGenerator.forBlock["scratch_variables_get"] = function (block) {
    const varName = javascriptGenerator.nameDB_?.getName(
      block.getFieldValue("VAR"),
      Blockly.VARIABLE_CATEGORY_NAME,
    );
    return [varName, Order.ATOMIC];
  };


  // Get list (reporter)
  Blockly.Blocks["scratch_list_get"] = {
    init: function () {
      this.appendDummyInput().appendField(
        new Blockly.FieldVariable("", undefined, ["list"], "list"),
        "LIST"
      );
      this.setOutput(true, null);
      this.setStyle("list_blocks");
      this.setTooltip("取得清單");
    },
  };
  javascriptGenerator.forBlock["scratch_list_get"] = function (block) {
    var field = block.getField("LIST");
    if (!field) {
      console.warn("Field 'LIST' not found on block:", block);
      return ["''", Order.ATOMIC]; // 預設回傳空字串，避免錯誤
    }

    var listName = javascriptGenerator.nameDB_.getName(
      field.getText(),
      Blockly.Names.NameType.VARIABLE
    );

    // 確保 listName 是有效的陣列
    return [`(${listName} = ${listName} || [], ${listName}.map(String).join(''))`, Order.ATOMIC];
  };

  // Add item to list
  Blockly.Blocks["scratch_list_add"] = {
    init: function () {
      // ✅ 使用 appendValueInput 添加 ITEM（需要有 shadow block）
      let itemInput = this.appendValueInput("ITEM")
        .setCheck(null)
        .appendField("添加");

      // ✅ 設定 shadow block，預設為空字串
      let shadowBlock = document.createElement("shadow");
      shadowBlock.setAttribute("type", "scratch_text");
      let field = document.createElement("field");
      field.setAttribute("name", "TEXT");
      field.textContent = "thing"; // 🔹 預設值為 ""
      shadowBlock.appendChild(field);

      itemInput.connection.setShadowDom(shadowBlock);

      // ✅ 設定 LIST 變數
      this.appendDummyInput()
        .appendField("到")
        .appendField(
          new Blockly.FieldVariable("", undefined, ["list"], "list"),
          "LIST"
        );

      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle("list_blocks");
      this.setTooltip("加入項目到清單末尾");
    },
  };

  // Get item at index
  Blockly.Blocks["scratch_list_get_item"] = {
    init: function () {
      this.appendDummyInput()
        // .appendField("取得")
        .appendField(
          new Blockly.FieldVariable("", undefined, ["list"], "list"),
          "LIST"
        );


      let valueInput = this.appendValueInput("INDEX").setCheck("Number").appendField("的第");
      // this.appendValueInput("INDEX").setCheck("Number").appendField("的第");

      // ✅ 使用 appendValueInput 確保顯示白色橢圓輸入框
      // let valueInput = this.appendValueInput("VALUE").setCheck(null);

      // ✅ 建立 shadow block
      let shadowBlock = document.createElement("shadow");
      shadowBlock.setAttribute("type", "math_number"); // 🔹 設定為數字輸入框
      let field = document.createElement("field");
      field.setAttribute("name", "NUM");
      field.textContent = "1"; // 🔹 預設值
      shadowBlock.appendChild(field);

      // ✅ 設定 shadow block，讓輸入框變成 Scratch 樣式
      valueInput.connection.setShadowDom(shadowBlock);
      this.appendDummyInput().appendField("項");
      this.setInputsInline(true);
      this.setOutput(true, null);
      this.setStyle("list_blocks");
      this.setTooltip("取得清單中指定位置的項目");
    },
  };
  javascriptGenerator.forBlock["scratch_list_get_item"] = function (block) {
    const field = block.getField("LIST");
    if (!field) {
      console.warn("Field 'LIST' not found on block:", block);
      return ["undefined", Order.ATOMIC];
    }

    var listName = javascriptGenerator.nameDB_.getName(
      field.getText(),
      Blockly.Names.NameType.VARIABLE
    );

    const index =
      javascriptGenerator.valueToCode(block, "INDEX", Order.ATOMIC) || "1";

    return [`(${listName} = ${listName} || [], ${listName}[${index} - 1])`, Order.MEMBER];



  };


  javascriptGenerator.forBlock["scratch_list_add"] = function (block) {
    const field = block.getField("LIST");
    if (!field) {
      console.warn("Field 'LIST' not found on block:", block);
      return "";
    }

    var listName = javascriptGenerator.nameDB_.getName(
      field.getText(),
      Blockly.Names.NameType.VARIABLE
    );

    let itemCode =
      javascriptGenerator.valueToCode(block, "ITEM", Order.NONE) || '""';

    // 嘗試將 `itemCode` 轉換為數字
    const numberCheck = `!isNaN(parseFloat(${itemCode})) && isFinite(${itemCode})`;

    return `${listName} = ${listName} || [];\n` +
      `${listName}.push(${numberCheck} ? Number(${itemCode}) : ${itemCode});\n`;
  };


  Blockly.Blocks["scratch_list_empty"] = {
    init: function () {
      this.appendDummyInput()
        // .appendField("清空")
        .appendField("刪除")
        .appendField(
          new Blockly.FieldVariable("", undefined, ["list"], "list"),
          "LIST"
        )
        .appendField("的所有項目");
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle("list_blocks");
      this.setTooltip("清空清單中的所有項目");
    },
  };

  javascriptGenerator.forBlock["scratch_list_empty"] = function (block) {
    const field = block.getField("LIST");
    if (!field) {
      console.warn("Field 'LIST' not found on block:", block);
      return "";
    }

    var listName = javascriptGenerator.nameDB_.getName(
      field.getText(),
      Blockly.Names.NameType.VARIABLE
    );

    return `${listName} = ${listName} || [];\n${listName}.length = 0;\n`;
  };

  Blockly.Blocks["scratch_list_length"] = {
    init: function () {
      this.appendDummyInput()
        // .appendField("取得")
        .appendField("清單")
        .appendField(
          new Blockly.FieldVariable("", undefined, ["list"], "list"),
          "LIST"
        )
        .appendField("的長度");
      this.setInputsInline(true);
      this.setOutput(true, "Number");
      this.setStyle("list_blocks");
      this.setTooltip("取得清單的長度");
    },
  };

  javascriptGenerator.forBlock["scratch_list_length"] = function (block) {
    const field = block.getField("LIST");
    if (!field) {
      console.warn("Field 'LIST' not found on block:", block);
      return ["0", Order.ATOMIC];
    }

    var listName = javascriptGenerator.nameDB_.getName(
      field.getText(),
      Blockly.Names.NameType.VARIABLE
    );

    return [`(${listName} = ${listName} || []).length`, Order.MEMBER];
  };

  Blockly.Blocks["scratch_list_insert"] = {
    init: function () {
      let itemInput = this.appendValueInput("ITEM").setCheck(null).appendField("插入");

      // ✅ 設定 `ITEM` 的白色橢圓 Shadow Block（字串輸入框）
      let itemShadow = document.createElement("shadow");
      itemShadow.setAttribute("type", "scratch_text"); // 讓 ITEM 變成文字輸入框
      let itemField = document.createElement("field");
      itemField.setAttribute("name", "TEXT");
      itemField.textContent = "thing"; // 預設值
      itemShadow.appendChild(itemField);
      itemInput.connection.setShadowDom(itemShadow); // ✅ 讓 `ITEM` 變成 Scratch 樣式

      this.appendDummyInput()
        .appendField("到")
        .appendField(
          new Blockly.FieldVariable("", undefined, ["list"], "list"),
          "LIST"
        );

      let indexInput = this.appendValueInput("INDEX").setCheck("Number").appendField("的第");

      // ✅ 設定 `INDEX` 的白色橢圓 Shadow Block（數字輸入框）
      let indexShadow = document.createElement("shadow");
      indexShadow.setAttribute("type", "math_number");
      let indexField = document.createElement("field");
      indexField.setAttribute("name", "NUM");
      indexField.textContent = "1"; // 預設值
      indexShadow.appendChild(indexField);
      indexInput.connection.setShadowDom(indexShadow); // ✅ 讓 `INDEX` 變成 Scratch 樣式

      this.appendDummyInput().appendField("項");

      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle("list_blocks");
      this.setTooltip("在指定位置插入項目");
    },
  };

  javascriptGenerator.forBlock["scratch_list_insert"] = function (block) {
    const field = block.getField("LIST");
    if (!field) {
      console.warn("Field 'LIST' not found on block:", block);
      return "";
    }

    var listName = javascriptGenerator.nameDB_.getName(
      field.getText(),
      Blockly.Names.NameType.VARIABLE
    );

    const index =
      javascriptGenerator.valueToCode(block, "INDEX", Order.ATOMIC) || "1";
    const item =
      javascriptGenerator.valueToCode(block, "ITEM", Order.NONE) || '""';

    return `${listName} = ${listName} || [];\n${listName}.splice(${index} - 1, 0, ${item});\n`;

  };

  Blockly.Blocks["scratch_list_set"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("替換")
        .appendField(
          new Blockly.FieldVariable("", undefined, ["list"], "list"),
          "LIST"
        );

      let indexInput = this.appendValueInput("INDEX").setCheck("Number").appendField("的第");

      // ✅ 設定 `INDEX` 的白色橢圓 Shadow Block（數字輸入框）
      let indexShadow = document.createElement("shadow");
      indexShadow.setAttribute("type", "math_number");
      let indexField = document.createElement("field");
      indexField.setAttribute("name", "NUM");
      indexField.textContent = "1"; // 預設值
      indexShadow.appendChild(indexField);
      indexInput.connection.setShadowDom(indexShadow); // ✅ 讓 `INDEX` 變成 Scratch 樣式

      let itemInput = this.appendValueInput("ITEM").setCheck(null).appendField("項為");

      // ✅ 設定 `ITEM` 的白色橢圓 Shadow Block（文字輸入框）
      let itemShadow = document.createElement("shadow");
      itemShadow.setAttribute("type", "scratch_text");
      let itemField = document.createElement("field");
      itemField.setAttribute("name", "TEXT");
      itemField.textContent = "新值"; // 預設值
      itemShadow.appendChild(itemField);
      itemInput.connection.setShadowDom(itemShadow); // ✅ 讓 `ITEM` 變成 Scratch 樣式

      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle("list_blocks");
      this.setTooltip("修改指定位置的項目");
    },
  };

  javascriptGenerator.forBlock["scratch_list_set"] = function (block) {
    const field = block.getField("LIST");
    if (!field) {
      console.warn("Field 'LIST' not found on block:", block);
      return "";
    }

    var listName = javascriptGenerator.nameDB_.getName(
      field.getText(),
      Blockly.Names.NameType.VARIABLE
    );

    const index =
      javascriptGenerator.valueToCode(block, "INDEX", Order.ATOMIC) || "1";
    const item =
      javascriptGenerator.valueToCode(block, "ITEM", Order.NONE) || '""';

    return `${listName} = ${listName} || [];\n${listName}[${index} - 1] = ${item};\n`;

  };

  Blockly.Blocks["scratch_list_remove"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("刪除")
        .appendField(
          new Blockly.FieldVariable("", undefined, ["list"], "list"),
          "LIST"
        );

      // ✅ 加入 index 輸入框
      let indexInput = this.appendValueInput("INDEX")
        .setCheck("Number")
        .appendField("的第");

      // ✅ 建立 shadow block，預設值為 1（符合 Scratch 標準）
      let shadowBlock = document.createElement("shadow");
      shadowBlock.setAttribute("type", "math_number");
      let field = document.createElement("field");
      field.setAttribute("name", "NUM");
      field.textContent = "1"; // 🔹 預設為 1，而不是 0
      shadowBlock.appendChild(field);

      indexInput.connection.setShadowDom(shadowBlock); // ✅ 設定 shadow block

      this.appendDummyInput().appendField("項");
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle("list_blocks");
      this.setTooltip("刪除指定位置的項目");
    },
  };

  javascriptGenerator.forBlock["scratch_list_remove"] = function (block) {
    const field = block.getField("LIST");
    if (!field) {
      console.warn("Field 'LIST' not found on block:", block);
      return "";
    }

    var listName = javascriptGenerator.nameDB_.getName(
      field.getText(),
      Blockly.Names.NameType.VARIABLE
    );

    const index =
      javascriptGenerator.valueToCode(block, "INDEX", Order.ATOMIC) || "1";

    return `${listName} = ${listName} || [];\n${listName}.splice(${index} - 1, 1);\n`;

  };


  Blockly.Blocks["scratch_list_contain"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("清單") // ✅ 顯示標題
        .appendField(
          new Blockly.FieldVariable("myList", undefined, ["list"], "list"), // ✅ 只能選擇「清單」變數
          "LIST"
        )
        .appendField("包含");

      let itemInput = this.appendValueInput("ITEM").setCheck(null); // ✅ 可輸入任何類型的數據

      // ✅ 設定 `ITEM` 的白色橢圓 Shadow Block（文字輸入框）
      let itemShadow = document.createElement("shadow");
      itemShadow.setAttribute("type", "scratch_text");
      let itemField = document.createElement("field");
      itemField.setAttribute("name", "TEXT");
      itemField.textContent = "thing"; // 預設值
      itemShadow.appendChild(itemField);
      itemInput.connection.setShadowDom(itemShadow); // ✅ 讓 `ITEM` 變成 Scratch 樣式

      this.appendDummyInput().appendField("?"); // ✅ 加上問號

      this.setInputsInline(true); // ✅ 保持 Scratch 樣式
      this.setOutput(true, "Boolean"); // ✅ 返回布林值
      this.setStyle("list_blocks"); // ✅ 設定 Scratch 列表風格
      this.setTooltip("檢查清單是否包含指定的元素");
    },
  };


  javascriptGenerator.forBlock["scratch_list_contain"] = function (block) {
    const field = block.getField("LIST");
    if (!field) {
      console.warn("Field 'LIST' not found on block:", block);
      return ["false", Order.ATOMIC]; // 預設返回 false
    }

    var listName = javascriptGenerator.nameDB_?.getName(
      field.getText(),
      Blockly.Names.NameType.VARIABLE
    ) || "undefined_list";

    let item = javascriptGenerator.valueToCode(block, "ITEM", Order.ATOMIC) || '""';

    return [
      `(${listName} = ${listName} || [], 
      ${listName}.some(x => isNaN(x) ? String(x).trim() === String(${item}).trim() : Number(x) === Number(${item})))`,
      Order.ATOMIC
    ];
  };


  Blockly.Blocks["scratch_list_indexof"] = {
    init: function () {


      let itemInput = this.appendValueInput("ITEM").setCheck(null).appendField("");

      // ✅ 設定 `ITEM` 的白色橢圓 Shadow Block（文字輸入框）
      let itemShadow = document.createElement("shadow");
      itemShadow.setAttribute("type", "scratch_text");
      let itemField = document.createElement("field");
      itemField.setAttribute("name", "TEXT");
      itemField.textContent = "thing"; // 預設值
      itemShadow.appendChild(itemField);
      itemInput.connection.setShadowDom(itemShadow); // ✅ 讓 `ITEM` 變成 Scratch 樣式


      // this.appendValueInput("ITEM") // 🔹 可輸入要查找的值
      // .setCheck(null); // ✅ 允許所有類型（數字、文字），這樣就會是 Scratch 樣式的橢圓形白色框

      this.appendDummyInput()
        .appendField("在") // "在 [列表] 裡的項目編號"
        .appendField(
          new Blockly.FieldVariable("myList", undefined, ["list"], "list"), // 限制變數類型為「列表」
          "LIST"
        )
        .appendField("裡的項目編號");

      this.setInputsInline(true); // ✅ 保持 Scratch 樣式
      this.setOutput(true, "Number"); // ✅ 返回數字類型
      this.setStyle("list_blocks"); // ✅ 設定 Scratch 列表風格
      this.setTooltip("取得指定值在列表中的位置");
    },
  };


  javascriptGenerator.forBlock["scratch_list_indexof"] = function (block) {
    const listName = javascriptGenerator.nameDB_?.getName(
      block.getFieldValue("LIST"),
      Blockly.Names.NameType.VARIABLE
    ) || "undefined_list";

    let item = javascriptGenerator.valueToCode(block, "ITEM", Order.ATOMIC) || '""';

    return [
      `(${listName} = ${listName} || [], 
        ${listName}.map(x => isNaN(x) ? String(x).trim() : Number(x))
        .indexOf(isNaN(${item}) ? String(${item}).trim() : Number(${item})) + 1 || 0)`,
      Order.ATOMIC
    ];
  };



  // 二維清單積木設計

  Blockly.Blocks["scratch_list2d_setsize"] = {

    init: function () {
      this.appendDummyInput()
        .appendField("設定")
        .appendField(
          new Blockly.FieldVariable("", undefined, ["list2d"], "list2d"),
          "LIST"
        );

      let indexInput = this.appendValueInput("INDEX").setCheck("Number").appendField("的列大小為");

      // ✅ 設定 `INDEX` 的白色橢圓 Shadow Block（數字輸入框）
      let indexShadow = document.createElement("shadow");
      indexShadow.setAttribute("type", "math_number");
      let indexField = document.createElement("field");
      indexField.setAttribute("name", "NUM");
      indexField.textContent = "1"; // 預設值
      indexShadow.appendChild(indexField);
      indexInput.connection.setShadowDom(indexShadow); // ✅ 讓 `INDEX` 變成 Scratch 樣式

      let itemInput = this.appendValueInput("ITEM").setCheck(null).appendField(",欄大小為");

      // ✅ 設定 `ITEM` 的白色橢圓 Shadow Block（文字輸入框）
      let itemShadow = document.createElement("shadow");
      itemShadow.setAttribute("type", "scratch_text");
      let itemField = document.createElement("field");
      itemField.setAttribute("name", "TEXT");
      itemField.textContent = "1"; // 預設值
      itemShadow.appendChild(itemField);
      itemInput.connection.setShadowDom(itemShadow); // ✅ 讓 `ITEM` 變成 Scratch 樣式


      let inititemInput = this.appendValueInput("INIT").setCheck(null).appendField(",元素初始為");

      let inititemShadow = document.createElement("shadow");
      inititemShadow.setAttribute("type", "scratch_text");
      let inititemField = document.createElement("field");
      inititemField.setAttribute("name", "TEXT");
      inititemField.textContent = "0";
      inititemShadow.appendChild(inititemField); // ✅ 修正這行
      inititemInput.connection.setShadowDom(inititemShadow);


      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle("list_blocks");
      this.setTooltip("修改指定位置的項目");
    },

  };
  javascriptGenerator.forBlock["scratch_list2d_setsize"] = function (block) {
    const listName = javascriptGenerator.nameDB_.getName(
      block.getFieldValue("LIST"),
      Blockly.Names.NameType.VARIABLE
    );
    const rows = javascriptGenerator.valueToCode(block, "INDEX", Order.ATOMIC) || "1";
    const cols = javascriptGenerator.valueToCode(block, "ITEM", Order.ATOMIC) || "1";
    const init = javascriptGenerator.valueToCode(block, "INIT", Order.ATOMIC) || "0";

    return `${listName} = Array.from({ length: ${rows} }, () => Array.from({ length: ${cols} }, () => ${init}));\n`;
  };

  Blockly.Blocks["scratch_list2d_get"] = {
    init: function () {
      this.appendDummyInput().appendField(
        new Blockly.FieldVariable("", undefined, ["list2d"], "list2d"),
        "LIST"
      );
      this.setOutput(true, null);
      this.setStyle("list_blocks");
      this.setTooltip("取得清單");
    },
  };
  javascriptGenerator.forBlock["scratch_list2d_get"] = function (block) {
    const listName = javascriptGenerator.nameDB_.getName(
      block.getFieldValue("LIST"),
      Blockly.Names.NameType.VARIABLE
    );
    return [listName, Order.ATOMIC];
  };

  // Add item to list
  // Get item at index
  Blockly.Blocks["scratch_list2d_get_item"] = {
    init: function () {
      this.appendDummyInput()
        .appendField(
          new Blockly.FieldVariable("", undefined, ["list2d"], "list2d"),
          "LIST"
        );

      // 第 [row]
      let rowInput = this.appendValueInput("ROW").setCheck("Number").appendField("第");
      let rowShadow = document.createElement("shadow");
      rowShadow.setAttribute("type", "math_number");
      let rowField = document.createElement("field");
      rowField.setAttribute("name", "NUM");
      rowField.textContent = "1";
      rowShadow.appendChild(rowField);
      rowInput.connection.setShadowDom(rowShadow);

      // [col]
      let colInput = this.appendValueInput("COL").setCheck("Number").appendField("列,第");
      let colShadow = document.createElement("shadow");
      colShadow.setAttribute("type", "math_number");
      let colField = document.createElement("field");
      colField.setAttribute("name", "NUM");
      colField.textContent = "1";
      colShadow.appendChild(colField);
      colInput.connection.setShadowDom(colShadow);

      // 項（結尾詞）
      this.appendDummyInput().appendField("欄項");

      this.setInputsInline(true);
      this.setOutput(true, null);
      this.setStyle("list_blocks");
      this.setTooltip("取得 2D 清單中指定位置的項目");
    },
  };
  javascriptGenerator.forBlock["scratch_list2d_get_item"] = function (block) {
    const listName = javascriptGenerator.nameDB_.getName(
      block.getFieldValue("LIST"),
      Blockly.Names.NameType.VARIABLE
    );
    const row = javascriptGenerator.valueToCode(block, "ROW", Order.ATOMIC) || "1";
    const col = javascriptGenerator.valueToCode(block, "COL", Order.ATOMIC) || "1";

    return [`${listName}[${row} - 1][${col} - 1]`, Order.MEMBER];
  };

  Blockly.Blocks["scratch_list2d_set"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("替換")
        .appendField(
          new Blockly.FieldVariable("", undefined, ["list2d"], "list2d"),
          "LIST"
        );

      // 第 [row]
      let rowInput = this.appendValueInput("ROW").setCheck("Number").appendField("第");
      let rowShadow = document.createElement("shadow");
      rowShadow.setAttribute("type", "math_number");
      let rowField = document.createElement("field");
      rowField.setAttribute("name", "NUM");
      rowField.textContent = "1";
      rowShadow.appendChild(rowField);
      rowInput.connection.setShadowDom(rowShadow);

      // [col]
      let colInput = this.appendValueInput("COL").setCheck("Number").appendField("列,第");
      let colShadow = document.createElement("shadow");
      colShadow.setAttribute("type", "math_number");
      let colField = document.createElement("field");
      colField.setAttribute("name", "NUM");
      colField.textContent = "1";
      colShadow.appendChild(colField);
      colInput.connection.setShadowDom(colShadow);

      // 項為 [value]
      let itemInput = this.appendValueInput("ITEM").setCheck(null).appendField("欄項為");
      let itemShadow = document.createElement("shadow");
      itemShadow.setAttribute("type", "scratch_text");
      let itemField = document.createElement("field");
      itemField.setAttribute("name", "TEXT");
      itemField.textContent = "新值";
      itemShadow.appendChild(itemField);
      itemInput.connection.setShadowDom(itemShadow);

      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle("list_blocks");
      this.setTooltip("修改 2D 清單中指定位置的項目");
    },
  };

  javascriptGenerator.forBlock["scratch_list2d_set"] = function (block) {
    const field = block.getField("LIST");
    if (!field) {
      console.warn("Field 'LIST' not found on block:", block);
      return "";
    }

    const listName = javascriptGenerator.nameDB_.getName(
      field.getText(),
      Blockly.Names.NameType.VARIABLE
    );

    const row = javascriptGenerator.valueToCode(block, "ROW", Order.ATOMIC) || "1";
    const col = javascriptGenerator.valueToCode(block, "COL", Order.ATOMIC) || "1";
    const value = javascriptGenerator.valueToCode(block, "ITEM", Order.NONE) || "0";

    return `${listName}[${row} - 1][${col} - 1] = ${value};\n`;
  };


  const functionMixin = {
    parameters_: [],

    addParameter: function (name, type) {
      const stackInput = this.getInput("STACK");
      const stackConnection = stackInput?.connection;
      const stackTarget = stackConnection?.targetBlock();
      if (stackInput) {
        this.removeInput("STACK");
      }

      if (!this.parameters_) this.parameters_ = [];
      this.parameters_.push({ name, type });

      if (type === "Label") {
        this.appendDummyInput(name).appendField(name);
      } else {
        const input = this.appendValueInput(name).setCheck(
          type === "NumberString" ? ["Number", "String"] : "Boolean"
        );

        const workspace = this.workspace;
        const paramBlock = workspace.newBlock("scratch_function_param");
        paramBlock.setShadow(true);
        paramBlock.setMovable(false);
        paramBlock.setFieldValue(name, "PARAM_NAME");

        if (paramBlock.initSvg) paramBlock.initSvg();
        if (paramBlock.render) paramBlock.render();

        input.connection.connect(paramBlock.outputConnection);
      }

      if (stackInput) {
        this.appendStatementInput("STACK").setCheck(null);
        if (
          stackTarget &&
          !stackTarget.disposed &&
          stackTarget.previousConnection
        ) {
          this.getInput("STACK")?.connection?.connect(
            stackTarget.previousConnection
          );
        }
      }
    },

    mutationToDom: function () {
      const container = Blockly.utils.xml.createElement("mutation");
      const name = this.getField("NAME")?.getValue() || "";
      container.setAttribute("name", name);

      this.parameters_.forEach((param) => {
        const xmlParam = Blockly.utils.xml.createElement("arg");
        xmlParam.setAttribute("name", param.name);
        xmlParam.setAttribute("type", param.type);
        container.appendChild(xmlParam);
      });

      return container;
    },

    domToMutation: function (xmlElement) {
      if (!this.parameters_) this.parameters_ = [];

      const name = xmlElement.getAttribute("name") || "";
      const nameField = this.getField("NAME");
      if (nameField) {
        nameField.setValue(name);
      }

      const inputs = this.inputList.slice();
      for (const input of inputs) {
        if (!["HEADER", "STACK"].includes(input.name)) {
          this.removeInput(input.name);
        }
      }

      for (let i = 0, childNode; (childNode = xmlElement.childNodes[i]); i++) {
        if (childNode.nodeName.toLowerCase() === "arg") {
          const paramName = childNode.getAttribute("name");
          const paramType = childNode.getAttribute("type");
          if (paramName && paramType) {
            this.addParameter(paramName, paramType);
          }
        }
      }
    },
  };
  Blockly.Blocks["scratch_function_create"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("定義")
        .appendField(new Blockly.FieldLabel("新積木"), "NAME");
      this.setStyle("procedure_blocks");
      this.setInputsInline(true);
      this.parameters_ = [];
    },
    ...functionMixin,
  };

  Blockly.Blocks["scratch_function_definition"] = {
    init: function () {
      this.appendDummyInput("HEADER")
        .appendField("定義")
        .appendField(new Blockly.FieldLabel(" "), "NAME");
      this.appendStatementInput("STACK").setCheck(null);
      this.setStyle("procedure_blocks");
      this.setInputsInline(true);
      this.parameters_ = [];
    },
    ...functionMixin,
  };

  javascriptGenerator.forBlock["scratch_function_definition"] = function (
    block,
  ) {
    const funcName = block.getFieldValue("NAME");
    const branch = javascriptGenerator.statementToCode(block, "STACK");
    // const params = (block.parameters_ as ScratchFunctionParameter[])
    //   .filter((param) => param.type !== "Label")
    //   .map((param) => param.name)
    //   .join(", ");
    const params = (block.parameters_ || [])
      .filter((param) => param.type !== "Label")
      .map((param) => param.name)
      .join(", ");
    return `function ${funcName}(${params}) {\n${branch}}\n`;
  };

  Blockly.Blocks["scratch_function_call"] = {
    init: function () {
      this.appendDummyInput("HEADER").appendField(
        new Blockly.FieldLabel(" "),
        "NAME"
      );
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle("procedure_blocks");
      this.setInputsInline(true);
      this.parameters_ = [];
    },

    ...functionMixin,

    addParameter: function (name, type) {
      if (!this.parameters_) this.parameters_ = [];
      this.parameters_.push({ name: name, type: type });

      this.appendDummyInput("DUMMY_TEXT").appendField(name + ":");

      if (type !== "Label") {
        this.appendValueInput(name).setCheck(
          type === "NumberString" ? ["Number", "String"] : "Boolean"
        );
      }
    },
  };

  javascriptGenerator.forBlock["scratch_function_call"] = function (block) {
    const funcName = block.getFieldValue("NAME");

    const values = (block.parameters_ || [])
      .filter((param) => param.type !== "Label")
      .map(
        (param) =>
          javascriptGenerator.valueToCode(block, param.name, Order.NONE) ||
          "null"
      );

    return `${funcName}(${values.join(", ")});\n`;
  };

  Blockly.Blocks["scratch_function_param"] = {
    init: function () {
      this.appendDummyInput().appendField(
        new Blockly.FieldLabel(""),
        "PARAM_NAME"
      );
      this.setOutput(true, null);
      this.setStyle("procedure_parameter_blocks");
    },

    mutationToDom: function () {
      const container = Blockly.utils.xml.createElement("mutation");
      container.setAttribute("name", this.getFieldValue("PARAM_NAME"));
      container.setAttribute(
        "paramtype",
        (this.outputConnection &&
          this.outputConnection.check_ &&
          this.outputConnection.check_[0]) ||
        ""
      );
      return container;
    },

    domToMutation: function (xmlElement) {
      const name = xmlElement.getAttribute("name");
      const paramType = xmlElement.getAttribute("paramtype");

      if (name) {
        this.setFieldValue(name, "PARAM_NAME");
      }

      if (paramType) {
        this.setOutput(true, paramType);
      }
    },
  };

  javascriptGenerator.forBlock["scratch_function_param"] = function (block) {
    return [block.getFieldValue("PARAM_NAME"), Order.ATOMIC];
  };


  Blockly.Blocks["scratch_logic_compare"] = {
    init: function () {
      // this.appendValueInput("A").setCheck(["Number", "String"]);
      this.appendValueInput("A").setCheck(null);
      this.appendValueInput("B")
        // .setCheck(["Number", "String"])
        .setCheck(null)
        .appendField(
          new Blockly.FieldDropdown([
            ["=", "EQ"],
            ["≠", "NEQ"],
            ["<", "LT"],
            [">", "GT"],
            ["≤", "LTE"],
            ["≥", "GTE"],
          ]),
          "OP",
        );

      this.setInputsInline(true);
      this.setOutput(true, "Boolean");
      this.setStyle("calculation_blocks");
    },
  };
  javascriptGenerator.forBlock["scratch_logic_compare"] = function (block) {
    const operator = block.getFieldValue("OP");
    const order = Order.RELATIONAL;

    // 取得 A 和 B 的值
    let A = javascriptGenerator.valueToCode(block, "A", order) || "0";
    let B = javascriptGenerator.valueToCode(block, "B", order) || "0";

    const operators = {
      EQ: "===",
      NEQ: "!==",
      LT: "<",
      GT: ">",
      LTE: "<=",
      GTE: ">=",
    };

    let code = "";

    code += `(Number.isNaN(Number(${A})) || Number.isNaN(Number(${B}))
    ? String(${A}) ${operators[operator]} String(${B})
    : Number(${A}) ${operators[operator]} Number(${B}))`;

    return [code, order];
  };
}

module.exports = {
  initializeScratch,
};
