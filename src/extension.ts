import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// 获取本地化函数
const l10n = vscode.l10n;

/**
 * 输出模式枚举
 * Output mode enum
 */
enum OutputMode {
    NewDocument = 'newDocument',
    Clipboard = 'clipboard',
    FileOverwrite = 'fileOverwrite',
    FileAppend = 'fileAppend'
}

/**
 * 扩展激活函数
 * Extension activation function
 * @param context - 扩展上下文 / Extension context
 */
export function activate(context: vscode.ExtensionContext) {
    // 注册生成实例化命令
    // Register generate instance commands
    let instanceCmd = vscode.commands.registerCommand('verilog-testbench-plus.generateInstance', () => {
        generateCode(context, 'instance.template', l10n.t('Instance'), OutputMode.NewDocument);
    });

    let instanceClipboardCmd = vscode.commands.registerCommand('verilog-testbench-plus.generateInstanceToClipboard', () => {
        generateCode(context, 'instance.template', l10n.t('Instance'), OutputMode.Clipboard);
    });

    let instanceFileOverwriteCmd = vscode.commands.registerCommand('verilog-testbench-plus.generateInstanceToFileOverwrite', () => {
        generateCode(context, 'instance.template', l10n.t('Instance'), OutputMode.FileOverwrite);
    });

    let instanceFileAppendCmd = vscode.commands.registerCommand('verilog-testbench-plus.generateInstanceToFileAppend', () => {
        generateCode(context, 'instance.template', l10n.t('Instance'), OutputMode.FileAppend);
    });

    // 注册生成测试文件命令
    // Register generate testbench commands
    let testbenchCmd = vscode.commands.registerCommand('verilog-testbench-plus.generateTestbench', () => {
        generateCode(context, 'testbench.template', l10n.t('Testbench'), OutputMode.NewDocument);
    });

    let testbenchClipboardCmd = vscode.commands.registerCommand('verilog-testbench-plus.generateTestbenchToClipboard', () => {
        generateCode(context, 'testbench.template', l10n.t('Testbench'), OutputMode.Clipboard);
    });

    let testbenchFileOverwriteCmd = vscode.commands.registerCommand('verilog-testbench-plus.generateTestbenchToFileOverwrite', () => {
        generateCode(context, 'testbench.template', l10n.t('Testbench'), OutputMode.FileOverwrite);
    });

    let testbenchFileAppendCmd = vscode.commands.registerCommand('verilog-testbench-plus.generateTestbenchToFileAppend', () => {
        generateCode(context, 'testbench.template', l10n.t('Testbench'), OutputMode.FileAppend);
    });

    // 注册通用命令（根据设置选择输出模式）
    // Register general commands (select output mode based on settings)
    let instanceGeneralCmd = vscode.commands.registerCommand('verilog-testbench-plus.generateInstanceGeneral', () => {
        const config = vscode.workspace.getConfiguration('verilog-testbench-plus');
        const mode = config.get<string>('instanceOutputMode', OutputMode.NewDocument) as OutputMode;
        generateCode(context, 'instance.template', l10n.t('Instance'), mode);
    });

    let testbenchGeneralCmd = vscode.commands.registerCommand('verilog-testbench-plus.generateTestbenchGeneral', () => {
        const config = vscode.workspace.getConfiguration('verilog-testbench-plus');
        const mode = config.get<string>('testbenchOutputMode', OutputMode.NewDocument) as OutputMode;
        generateCode(context, 'testbench.template', l10n.t('Testbench'), mode);
    });

    // 编辑模板文件
    // Edit templates
    let testbenchTemplateEditCmd = vscode.commands.registerCommand('verilog-testbench-plus.editTestbenchTemplate', () => {
        const templatePath = path.join(context.extensionPath, 'templates', 'testbench.template');
        openFile(templatePath);
    });

    let instanceTemplateEditCmd = vscode.commands.registerCommand('verilog-testbench-plus.editInstanceTemplate', () => {
        const templatePath = path.join(context.extensionPath, 'templates', 'instance.template');
        openFile(templatePath);
    });



    // 将命令添加到订阅列表
    // Add commands to subscription list
    context.subscriptions.push(
        instanceCmd,
        instanceClipboardCmd,
        instanceFileOverwriteCmd,
        instanceFileAppendCmd,
        testbenchCmd,
        testbenchClipboardCmd,
        testbenchFileOverwriteCmd,
        testbenchFileAppendCmd,
        instanceGeneralCmd,
        testbenchGeneralCmd,
        testbenchTemplateEditCmd,
        instanceTemplateEditCmd
    );
}

/**
 * 打开文件
 * Open file
 * @param path - 文件路径 / File path
 */
async function openFile(path: string) {
    const doc = await vscode.workspace.openTextDocument(path);
    vscode.window.showTextDocument(doc);
}

/**
 * 生成代码的主函数
 * Main function for code generation
 * @param context - 扩展上下文 / Extension context
 * @param templateFile - 模板文件名 / Template file name
 * @param type - 生成类型（Instance或Testbench）/ Generation type (Instance or Testbench)
 * @param outputMode - 输出模式 / Output mode
 */
async function generateCode(context: vscode.ExtensionContext, templateFile: string, type: string, outputMode: OutputMode) {
    // 获取当前活动文件
    // Get current active editor
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage(l10n.t('No active editor'));
        return;
    }

    const document = editor.document;

    // 检查是否为Verilog文件
    // Check if it's a Verilog file
    if (document.languageId !== 'verilog' && !document.fileName.endsWith('.v')) {
        vscode.window.showErrorMessage(l10n.t('Current file is not a Verilog file'));
        return;
    }

    try {
        // 读取文件内容
        // Read file content
        const content = document.getText();

        // 解析Verilog文件
        // Parse Verilog file
        const moduleInfo = parseVerilogModule(content);
        if (!moduleInfo) {
            vscode.window.showErrorMessage(l10n.t('Could not parse module information'));
            return;
        }

        // 读取模板文件
        // Read template file
        const templatePath = path.join(context.extensionPath, 'templates', templateFile);
        const template = fs.readFileSync(templatePath, 'utf8');

        // 替换模板中的占位符
        // Replace placeholders in template
        const output = replaceTemplate(template, moduleInfo);

        // 根据输出模式处理结果
        // Handle result based on output mode
        switch (outputMode) {
            case OutputMode.NewDocument:
                await outputToNewDocument(output);
                vscode.window.showInformationMessage(l10n.t('{0} generated successfully', type));
                break;

            case OutputMode.Clipboard:
                await outputToClipboard(output);
                vscode.window.showInformationMessage(l10n.t('{0} copied to clipboard', type));
                break;

            case OutputMode.FileOverwrite:
                await outputToFile(output, document.fileName, type, false);
                break;

            case OutputMode.FileAppend:
                await outputToFile(output, document.fileName, type, true);
                break;
        }
    } catch (error) {
        vscode.window.showErrorMessage(l10n.t('Error generating {0}: {1}', type, <string>error));
    }
}

/**
 * 输出到新文档
 * Output to new document
 * @param content - 内容 / Content
 */
async function outputToNewDocument(content: string) {
    const newDoc = await vscode.workspace.openTextDocument({
        content: content,
        language: 'verilog'
    });
    await vscode.window.showTextDocument(newDoc);
}

/**
 * 输出到剪贴板
 * Output to clipboard
 * @param content - 内容 / Content
 */
async function outputToClipboard(content: string) {
    await vscode.env.clipboard.writeText(content);
}

/**
 * 输出到文件
 * Output to file
 * @param content - 内容 / Content
 * @param sourceFile - 源文件路径 / Source file path
 * @param type - 生成类型 / Generation type
 * @param append - 是否追加 / Whether to append
 */
async function outputToFile(content: string, sourceFile: string, type: string, append: boolean) {
    const config = vscode.workspace.getConfiguration('verilog-testbench-plus');
    const outputPath = type === l10n.t('Instance')
        ? config.get<string>('instanceOutputPath', './')
        : config.get<string>('testbenchOutputPath', './');

    // 获取源文件的目录和基本名称
    // Get source file directory and base name
    const sourceDir = path.dirname(sourceFile);
    const baseName = path.basename(sourceFile, '.v');

    // 生成输出文件名
    // Generate output file name
    const outputFileName = `tb_${baseName}.v`;

    // 解析输出路径（相对于源文件目录）
    // Resolve output path (relative to source file directory)
    const fullOutputPath = path.resolve(sourceDir, outputPath);

    // 创建目录（如果不存在）
    // Create directory if it doesn't exist
    if (!fs.existsSync(fullOutputPath)) {
        fs.mkdirSync(fullOutputPath, { recursive: true });
    }

    // 完整的输出文件路径
    // Full output file path
    const outputFilePath = path.join(fullOutputPath, outputFileName);

    try {
        if (append && fs.existsSync(outputFilePath)) {
            // 追加模式
            // Append mode
            const existingContent = fs.readFileSync(outputFilePath, 'utf8');
            fs.writeFileSync(outputFilePath, existingContent + '\n\n' + content, 'utf8');
            vscode.window.showInformationMessage(l10n.t('{0} appended to {1}', type, outputFileName));
        } else {
            // 覆盖模式
            // Overwrite mode
            fs.writeFileSync(outputFilePath, content, 'utf8');
            vscode.window.showInformationMessage(l10n.t('{0} written to {1}', type, outputFileName));
        }

        // 打开生成的文件
        // Open generated file
        const doc = await vscode.workspace.openTextDocument(outputFilePath);
        await vscode.window.showTextDocument(doc);
    } catch (error) {
        vscode.window.showErrorMessage(l10n.t('Error writing to file: {0}', <string>error));
    }
}

/**
 * 模块信息接口
 * Module information interface
 */
interface ModuleInfo {
    name: string;                                          // 模块名 / Module name
    parameters: Array<{ name: string, value: string }>;    // 参数列表 / Parameter list
    inputs: Array<{ name: string, range: string }>;        // 输入端口列表 / Input port list
    outputs: Array<{ name: string, range: string }>;       // 输出端口列表 / Output port list
    inouts: Array<{ name: string, range: string }>;        // 双向端口列表 / Inout port list
}

/**
 * 解析Verilog模块
 * Parse Verilog module
 * @param content - Verilog文件内容 / Verilog file content
 * @returns 模块信息或null / Module information or null
 */
function parseVerilogModule(content: string): ModuleInfo | null {
    // 删除注释
    // Remove comments
    content = removeComments(content);

    // 删除task和function块，避免干扰解析
    // Remove task and function blocks to avoid parsing interference
    content = removeBlocks(content);

    // 提取module块
    // Extract module block
    const moduleMatch = content.match(/\bmodule\b([\s\S]*?)\bendmodule\b/);
    if (!moduleMatch) return null;

    const moduleContent = moduleMatch[1];

    // 提取模块名
    // Extract module name
    const nameMatch = moduleContent.match(/^\s*([a-zA-Z_][a-zA-Z_0-9]*)/);
    if (!nameMatch) return null;

    const moduleName = nameMatch[1];

    // 提取参数
    // Extract parameters
    const parameters = extractParameters(moduleContent);

    // 提取各类端口
    // Extract all types of ports
    const inputs = extractPorts(moduleContent, 'input');
    const outputs = extractPorts(moduleContent, 'output');
    const inouts = extractPorts(moduleContent, 'inout');

    return {
        name: moduleName,
        parameters,
        inputs,
        outputs,
        inouts
    };
}

/**
 * 删除注释
 * Remove comments
 * @param text - 原始文本 / Original text
 * @returns 删除注释后的文本 / Text without comments
 */
function removeComments(text: string): string {
    // 删除多行注释 /* ... */
    // Remove multi-line comments /* ... */
    text = text.replace(/\/\*[\s\S]*?\*\//g, '\n');

    // 删除单行注释 //
    // Remove single-line comments //
    text = text.replace(/\/\/.*$/gm, '\n');
    return text;
}

/**
 * 删除task和function块
 * Remove task and function blocks
 * @param text - 原始文本 / Original text
 * @returns 删除块后的文本 / Text without blocks
 */
function removeBlocks(text: string): string {
    // 删除task块
    // Remove task blocks
    text = text.replace(/\btask\b[\s\S]*?\bendtask\b/g, '\n');

    // 删除function块
    // Remove function blocks
    text = text.replace(/\bfunction\b[\s\S]*?\bendfunction\b/g, '\n');
    return text;
}

/**
 * 提取参数定义
 * Extract parameter definitions
 * @param content - 模块内容 / Module content
 * @returns 参数数组 / Parameter array
 */
function extractParameters(content: string): Array<{ name: string, value: string }> {
    const params: Array<{ name: string, value: string }> = [];

    // 匹配parameter声明
    // Match parameter declarations
    const paramRegex = /\bparameter\s+([a-zA-Z_][a-zA-Z_0-9]*)\s*=\s*([^;,)]+)/g;

    let match;
    while ((match = paramRegex.exec(content)) !== null) {
        params.push({
            name: match[1].trim(),
            value: match[2].trim()
        });
    }

    return params;
}

/**
 * 解析端口列表
 * Parse port list
 * @param portList - 端口列表字符串 / Port list string
 * @param range - 端口位宽 / Port range
 * @returns 端口数组 / Port array
 */
function parsePortList(portList: string, range: string): Array<{ name: string, range: string }> {
    const ports: Array<{ name: string, range: string }> = [];

    // 按逗号分割端口
    // Split ports by comma
    const portNames = portList.split(',');

    for (let portName of portNames) {
        portName = portName.trim();
        if (portName) {
            // 移除赋值部分（例如：port = default_value）
            // Remove assignment if present (e.g., port = default_value)
            const cleanName = portName.replace(/\s*=.*/, '').trim();
            if (cleanName) {
                ports.push({
                    name: cleanName,
                    range: range
                });
            }
        }
    }

    return ports;
}

/**
 * 提取指定类型的端口
 * Extract ports of specified type
 * @param content - 模块内容 / Module content
 * @param portType - 端口类型（input/output/inout）/ Port type (input/output/inout)
 * @returns 端口数组 / Port array
 */
function extractPorts(content: string, portType: string): Array<{ name: string, range: string }> {
    // 构建匹配端口声明的正则表达式
    // Build regex pattern for port declaration matching
    // 匹配格式: input [wire|reg] [signed] [range] port_list
    // Match format: input [wire|reg] [signed] [range] port_list
    const pattern = new RegExp(
        `\\b${portType}` +
        `(\\s+(wire|reg)\\s*)*` +
        `(\\s*signed\\s*)*` +
        `(\\s*\\[.*?:.*?\\]\\s*)*` +
        `([\\s\\S]*?)` +
        `(?=\\binput\\b|\\boutput\\b|\\binout\\b|;|\\))`,
        'gm'
    );

    const matches = [...content.matchAll(pattern)];
    const ports: Array<{ name: string, range: string }> = [];

    for (const match of matches) {
        if (match.length >= 5) {
            // 提取位宽信息（如 [7:0]）
            // Extract range information (e.g., [7:0])
            const range = (match[4] || '').trim();

            // 提取端口列表
            // Extract port list
            const portList = match[5];
            const individualPorts = parsePortList(portList, range);
            ports.push(...individualPorts);
        }
    }

    return ports;
}

/**
 * 替换模板中的占位符
 * Replace placeholders in template
 * @param template - 模板字符串 / Template string
 * @param info - 模块信息 / Module information
 * @returns 替换后的字符串 / String after replacement
 */
function replaceTemplate(template: string, info: ModuleInfo): string {
    let result = template;

    // 替换模块名
    // Replace module name
    result = result.replace(/\${MODULE_NAME}/g, info.name);

    // 生成参数声明
    // Generate parameter declaration
    const paramDecl = generateParameterDeclaration(info.parameters);
    result = result.replace(/\${PARAMETER_DECLARATION}/g, paramDecl);

    // 生成参数定义（用于实例化）
    // Generate parameter definition (for instantiation)
    const paramDef = generateParameterDefinition(info.parameters);
    result = result.replace(/\${PARAMETER_DEFINITION}/g, paramDef);

    // 生成输入声明
    // Generate input declaration
    const inputDecl = generatePortDeclaration(info.inputs, 'reg');
    result = result.replace(/\${INPUT_DECLARATION}/g, inputDecl);

    // 生成输出声明
    // Generate output declaration
    const outputDecl = generatePortDeclaration(info.outputs, 'wire');
    result = result.replace(/\${OUTPUT_DECLARATION}/g, outputDecl);

    // 生成双向端口声明
    // Generate inout declaration
    const inoutDecl = generatePortDeclaration(info.inouts, 'wire');
    result = result.replace(/\${INOUT_DECLARATION}/g, inoutDecl);

    // 生成端口连接
    // Generate port connection
    const portConn = generatePortConnection(info);
    result = result.replace(/\${PORT_CONNECTION}/g, portConn);

    // 清理多余的空行
    // Clean up excessive empty lines
    result = result.replace(/\n\s*\n\s*\n/g, '\n\n');

    return result;
}

/**
 * 生成参数声明（用于testbench）
 * Generate parameter declaration (for testbench)
 * @param params - 参数数组 / Parameter array
 * @returns 参数声明字符串 / Parameter declaration string
 */
function generateParameterDeclaration(params: Array<{ name: string, value: string }>): string {
    if (params.length === 0) return '';

    // 计算最大长度用于对齐
    // Calculate maximum length for alignment
    const maxNameLen = Math.max(...params.map(p => p.name.length));
    const maxValueLen = Math.max(...params.map(p => p.value.length));

    return params.map(p =>
        `parameter ${p.name.padEnd(maxNameLen + 1)} = ${p.value.padEnd(maxValueLen)};`
    ).join('\n');
}

/**
 * 生成参数定义（用于实例化时的参数传递）
 * Generate parameter definition (for parameter passing during instantiation)
 * @param params - 参数数组 / Parameter array
 * @returns 参数定义字符串 / Parameter definition string
 */
function generateParameterDefinition(params: Array<{ name: string, value: string }>): string {
    if (params.length === 0) return '';

    // 计算最大长度用于对齐
    // Calculate maximum length for alignment
    const maxLen = Math.max(...params.map(p => p.name.length), 24);

    const lines = params.map(p =>
        `    .${p.name.padEnd(maxLen)}( ${p.name.padEnd(maxLen + 2)} )`
    );

    return '#(\n' + lines.join(',\n') + '\n)';
}

/**
 * 生成端口声明
 * Generate port declaration
 * @param ports - 端口数组 / Port array
 * @param portType - 端口类型（reg/wire）/ Port type (reg/wire)
 * @returns 端口声明字符串 / Port declaration string
 */
function generatePortDeclaration(ports: Array<{ name: string, range: string }>, portType: string): string {
    if (ports.length === 0) return '';

    return ports.map(p => {
        const rangeStr = p.range ? p.range + ' ' : '';
        let initValue = '';

        // 为reg类型端口添加初始值
        // Add initial value for reg type ports
        if (portType === 'reg') {
            initValue = ' = 0';
        }

        return `${portType.padEnd(4)}  ${rangeStr}${p.name}${initValue};`;
    }).join('\n');
}

/**
 * 生成端口连接（用于实例化）
 * Generate port connection (for instantiation)
 * @param info - 模块信息 / Module information
 * @returns 端口连接字符串 / Port connection string
 */
function generatePortConnection(info: ModuleInfo): string {
    const allPorts = [
        ...info.inputs,
        ...info.outputs,
        ...info.inouts
    ];

    if (allPorts.length === 0) return '';

    // 计算最大名称长度，用于对齐
    // Calculate maximum name length for alignment
    const maxNameLen = Math.max(...allPorts.map(p => p.name.length), 24);

    const groups: string[][] = [];

    // 按类型分组：输入、输出、双向
    // Group by type: inputs, outputs, inouts
    if (info.inputs.length > 0) {
        groups.push(info.inputs.map(p =>
            `    .${p.name.padEnd(maxNameLen)}( ${p.name.padEnd(maxNameLen + 2)} )`
        ));
    }

    if (info.outputs.length > 0) {
        groups.push(info.outputs.map(p =>
            `    .${p.name.padEnd(maxNameLen)}( ${p.name.padEnd(maxNameLen + 2)} )`
        ));
    }

    if (info.inouts.length > 0) {
        groups.push(info.inouts.map(p =>
            `    .${p.name.padEnd(maxNameLen)}( ${p.name.padEnd(maxNameLen + 2)} )`
        ));
    }

    // 每组内部用 ',\n' 连接，组之间用 ',\n\n' 连接（增加空行）
    // Join within groups with ',\n', between groups with ',\n\n' (add empty line)
    return groups
        .map(group => group.join(',\n'))
        .join(',\n\n');
}

/**
 * 扩展停用函数
 * Extension deactivation function
 */
export function deactivate() { }