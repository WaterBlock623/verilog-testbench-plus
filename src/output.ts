import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { OutputMode, GenerationType } from './types';

const l10n = vscode.l10n;

/**
 * 输出到新文档
 */
export async function outputToNewDocument(content: string): Promise<void> {
    const newDoc = await vscode.workspace.openTextDocument({
        content: content,
        language: 'verilog'
    });
    await vscode.window.showTextDocument(newDoc);
}

/**
 * 输出到剪贴板
 */
export async function outputToClipboard(content: string): Promise<void> {
    await vscode.env.clipboard.writeText(content);
}

/**
 * 输出到文件
 */
export async function outputToFile(
    content: string,
    sourceFile: string,
    type: GenerationType,
    append: boolean
): Promise<void> {
    const config = vscode.workspace.getConfiguration('verilog-testbench-plus');
    const outputPath = type === GenerationType.Instance
        ? config.get<string>('instanceOutputPath', './')
        : config.get<string>('testbenchOutputPath', './');

    const sourceDir = path.dirname(sourceFile);
    const baseName = path.basename(sourceFile, '.v');

    // 生成输出文件名
    const outputFileNameConfig = type === GenerationType.Instance
        ? config.get<string>('instanceOutputFileName', '${baseName}_inst.v')
        : config.get<string>('testbenchOutputFileName', 'tb_${baseName}.v');
    
    const pattern = new RegExp('\\$\\{baseName\\}', 'g');
    const outputFileName = outputFileNameConfig.replace(pattern, baseName);

    // 解析输出路径
    const fullOutputPath = path.resolve(sourceDir, outputPath);

    // 创建目录
    if (!fs.existsSync(fullOutputPath)) {
        fs.mkdirSync(fullOutputPath, { recursive: true });
    }

    const outputFilePath = path.join(fullOutputPath, outputFileName);

    try {
        if (append && fs.existsSync(outputFilePath)) {
            const existingContent = fs.readFileSync(outputFilePath, 'utf8');
            fs.writeFileSync(outputFilePath, existingContent + '\n\n' + content, 'utf8');
            vscode.window.showInformationMessage(
                l10n.t('{0} appended to {1}', l10n.t(type), outputFileName)
            );
        } else {
            fs.writeFileSync(outputFilePath, content, 'utf8');
            vscode.window.showInformationMessage(
                l10n.t('{0} written to {1}', l10n.t(type), outputFileName)
            );
        }

        // 打开生成的文件
        const doc = await vscode.workspace.openTextDocument(outputFilePath);
        await vscode.window.showTextDocument(doc);
    } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(l10n.t('Error writing to file: {0}', errMsg));
        console.error(error);
    }
}

/**
 * 处理输出
 */
export async function handleOutput(
    output: string,
    outputMode: OutputMode,
    type: GenerationType,
    fileName: string
): Promise<void> {
    switch (outputMode) {
        case OutputMode.NewDocument:
            await outputToNewDocument(output);
            vscode.window.showInformationMessage(
                l10n.t('{0} generated successfully', l10n.t(type))
            );
            break;

        case OutputMode.Clipboard:
            await outputToClipboard(output);
            vscode.window.showInformationMessage(
                l10n.t('{0} copied to clipboard', l10n.t(type))
            );
            break;

        case OutputMode.FileOverwrite:
            await outputToFile(output, fileName, type, false);
            break;

        case OutputMode.FileAppend:
            await outputToFile(output, fileName, type, true);
            break;
    }
}