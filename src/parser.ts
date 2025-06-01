import { ModuleInfo, Parameter, Port } from './types';

/**
 * 解析Verilog模块
 */
export function parseVerilogModule(content: string): ModuleInfo | null {
    // 删除注释和干扰块
    content = removeComments(content);
    content = removeBlocks(content);

    // 提取module块
    const moduleMatch = content.match(/\bmodule\b([\s\S]*?)\bendmodule\b/);
    if (!moduleMatch) return null;

    const moduleContent = moduleMatch[1];

    // 提取模块名
    const nameMatch = moduleContent.match(/^\s*([a-zA-Z_][a-zA-Z_0-9]*)/);
    if (!nameMatch) return null;

    const moduleName = nameMatch[1];

    // 提取各部分信息
    const parameters = extractParameters(moduleContent);
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
 */
function removeComments(text: string): string {
    // 删除多行注释 /* ... */
    text = text.replace(/\/\*[\s\S]*?\*\//g, '\n');
    // 删除单行注释 //
    text = text.replace(/\/\/.*$/gm, '\n');
    return text;
}

/**
 * 删除task和function块
 */
function removeBlocks(text: string): string {
    text = text.replace(/\btask\b[\s\S]*?\bendtask\b/g, '\n');
    text = text.replace(/\bfunction\b[\s\S]*?\bendfunction\b/g, '\n');
    return text;
}

/**
 * 提取参数定义
 */
function extractParameters(content: string): Parameter[] {
    const params: Parameter[] = [];
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
 */
function parsePortList(portList: string, range: string): Port[] {
    const ports: Port[] = [];
    const portNames = portList.split(',');

    for (let portName of portNames) {
        portName = portName.trim();
        if (portName) {
            // 移除赋值部分
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
 */
function extractPorts(content: string, portType: string): Port[] {
    const pattern = new RegExp(
        `\\b${portType}` +
        `(\\s+(wire|reg)\\s*)?` +
        `(\\s*signed\\s*)?` +
        `(\\s*\\[[^\\]]*\\]\\s*)?` +
        `([\\s\\S]*?)` +
        `(?=\\b(input|output|inout|endmodule)\\b|;|\\))`,
        'gm'
    );

    const matches = [...content.matchAll(pattern)];
    const ports: Port[] = [];

    for (const match of matches) {
        if (match.length >= 5) {
            const range = (match[4] || '').trim();
            const portList = match[5];
            const individualPorts = parsePortList(portList, range);
            ports.push(...individualPorts);
        }
    }

    return ports;
}