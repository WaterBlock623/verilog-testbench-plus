import * as vscode from 'vscode';
import * as path from 'path';
import { OutputMode, GenerationType, GenerateOptions } from './types';
import { generateCode, openFile } from './generator';

/**
 * 命令配置接口
 */
interface CommandConfig {
    id: string;
    handler: () => void | Promise<void>;
}

/**
 * 创建生成代码的命令处理器
 */
function createGenerateHandler(
    context: vscode.ExtensionContext,
    templateFile: string,
    type: GenerationType,
    outputMode: OutputMode
): () => void {
    return () => {
        const options: GenerateOptions = {
            context,
            templateFile,
            type,
            outputMode
        };
        generateCode(options);
    };
}

/**
 * 创建通用命令处理器（根据配置选择输出模式）
 */
function createGeneralHandler(
    context: vscode.ExtensionContext,
    templateFile: string,
    type: GenerationType,
    configKey: string
): () => void {
    return () => {
        const config = vscode.workspace.getConfiguration('verilog-testbench-plus');
        const mode = config.get<string>(configKey, OutputMode.NewDocument) as OutputMode;
        const options: GenerateOptions = {
            context,
            templateFile,
            type,
            outputMode: mode
        };
        generateCode(options);
    };
}

/**
 * 创建编辑模板的命令处理器
 */
function createEditTemplateHandler(
    context: vscode.ExtensionContext,
    templateFile: string
): () => void {
    return () => {
        const templatePath = path.join(context.extensionPath, 'templates', templateFile);
        openFile(templatePath);
    };
}

/**
 * 获取所有命令配置
 */
export function getCommands(context: vscode.ExtensionContext): CommandConfig[] {
    return [
        // Instance 相关命令
        {
            id: 'verilog-testbench-plus.generateInstance',
            handler: createGenerateHandler(
                context,
                'instance.template',
                GenerationType.Instance,
                OutputMode.NewDocument
            )
        },
        {
            id: 'verilog-testbench-plus.generateInstanceToClipboard',
            handler: createGenerateHandler(
                context,
                'instance.template',
                GenerationType.Instance,
                OutputMode.Clipboard
            )
        },
        {
            id: 'verilog-testbench-plus.generateInstanceToFileOverwrite',
            handler: createGenerateHandler(
                context,
                'instance.template',
                GenerationType.Instance,
                OutputMode.FileOverwrite
            )
        },
        {
            id: 'verilog-testbench-plus.generateInstanceToFileAppend',
            handler: createGenerateHandler(
                context,
                'instance.template',
                GenerationType.Instance,
                OutputMode.FileAppend
            )
        },
        {
            id: 'verilog-testbench-plus.generateInstanceGeneral',
            handler: createGeneralHandler(
                context,
                'instance.template',
                GenerationType.Instance,
                'instanceOutputMode'
            )
        },

        // Testbench 相关命令
        {
            id: 'verilog-testbench-plus.generateTestbench',
            handler: createGenerateHandler(
                context,
                'testbench.template',
                GenerationType.Testbench,
                OutputMode.NewDocument
            )
        },
        {
            id: 'verilog-testbench-plus.generateTestbenchToClipboard',
            handler: createGenerateHandler(
                context,
                'testbench.template',
                GenerationType.Testbench,
                OutputMode.Clipboard
            )
        },
        {
            id: 'verilog-testbench-plus.generateTestbenchToFileOverwrite',
            handler: createGenerateHandler(
                context,
                'testbench.template',
                GenerationType.Testbench,
                OutputMode.FileOverwrite
            )
        },
        {
            id: 'verilog-testbench-plus.generateTestbenchToFileAppend',
            handler: createGenerateHandler(
                context,
                'testbench.template',
                GenerationType.Testbench,
                OutputMode.FileAppend
            )
        },
        {
            id: 'verilog-testbench-plus.generateTestbenchGeneral',
            handler: createGeneralHandler(
                context,
                'testbench.template',
                GenerationType.Testbench,
                'testbenchOutputMode'
            )
        },

        // 编辑模板命令
        {
            id: 'verilog-testbench-plus.editTestbenchTemplate',
            handler: createEditTemplateHandler(context, 'testbench.template')
        },
        {
            id: 'verilog-testbench-plus.editInstanceTemplate',
            handler: createEditTemplateHandler(context, 'instance.template')
        }
    ];
}