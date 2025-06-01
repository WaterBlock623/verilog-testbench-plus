import * as vscode from 'vscode';
import * as fs from 'fs';
import { GenerateOptions } from './types';
import { parseVerilogModule } from './parser';
import { replaceTemplate } from './template';
import { handleOutput } from './output';

const l10n = vscode.l10n;

/**
 * 生成代码的主函数
 */
export async function generateCode(options: GenerateOptions): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage(l10n.t('No active editor'));
        return;
    }

    const document = editor.document;

    // 检查是否为Verilog文件
    if (!isVerilogFile(document)) {
        vscode.window.showErrorMessage(l10n.t('Current file is not a Verilog file'));
        return;
    }

    try {
        // 解析Verilog文件
        const content = document.getText();
        const moduleInfo = parseVerilogModule(content);

        if (!moduleInfo) {
            vscode.window.showErrorMessage(l10n.t('Could not parse module information'));
            return;
        }

        // 获取选中的模板路径
        const templatePath = options.templateManager.getSelectedTemplatePath(options.type);

        // 读取模板文件
        const template = fs.readFileSync(templatePath, 'utf8');

        // 替换模板中的占位符
        const output = replaceTemplate(template, moduleInfo);

        // 处理输出
        await handleOutput(output, options.outputMode, options.type, document.fileName);

    } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(
            l10n.t('Error generating {0}: {1}', l10n.t(options.type), errMsg)
        );
        console.error(error);
    }
}

/**
 * 检查是否为Verilog文件
 */
function isVerilogFile(document: vscode.TextDocument): boolean {
    return document.languageId === 'verilog' || document.fileName.endsWith('.v');
}

/**
 * 打开文件
 */
export async function openFile(path: string): Promise<void> {
    const doc = await vscode.workspace.openTextDocument(path);
    vscode.window.showTextDocument(doc);
}