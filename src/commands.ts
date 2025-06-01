import * as vscode from 'vscode';
import * as path from 'path';
import { OutputMode, GenerationType, GenerateOptions } from './types';
import { generateCode, openFile } from './generator';
import { TemplateManager } from './templateManager';

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
    templateManager: TemplateManager,
    type: GenerationType,
    outputMode: OutputMode
): () => void {
    return () => {
        const options: GenerateOptions = {
            context,
            templateManager,
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
    templateManager: TemplateManager,
    type: GenerationType,
    configKey: string
): () => void {
    return () => {
        const config = vscode.workspace.getConfiguration('verilog-testbench-plus');
        const mode = config.get<string>(configKey, OutputMode.NewDocument) as OutputMode;
        const options: GenerateOptions = {
            context,
            templateManager,
            type,
            outputMode: mode
        };
        generateCode(options);
    };
}

/**
 * 获取所有命令配置
 */
export function getCommands(context: vscode.ExtensionContext): CommandConfig[] {
    const templateManager = new TemplateManager(context);
    
    return [
        // Instance 相关命令
        {
            id: 'verilog-testbench-plus.generateInstance',
            handler: createGenerateHandler(
                context,
                templateManager,
                GenerationType.Instance,
                OutputMode.NewDocument
            )
        },
        {
            id: 'verilog-testbench-plus.generateInstanceToClipboard',
            handler: createGenerateHandler(
                context,
                templateManager,
                GenerationType.Instance,
                OutputMode.Clipboard
            )
        },
        {
            id: 'verilog-testbench-plus.generateInstanceToFileOverwrite',
            handler: createGenerateHandler(
                context,
                templateManager,
                GenerationType.Instance,
                OutputMode.FileOverwrite
            )
        },
        {
            id: 'verilog-testbench-plus.generateInstanceToFileAppend',
            handler: createGenerateHandler(
                context,
                templateManager,
                GenerationType.Instance,
                OutputMode.FileAppend
            )
        },
        {
            id: 'verilog-testbench-plus.generateInstanceGeneral',
            handler: createGeneralHandler(
                context,
                templateManager,
                GenerationType.Instance,
                'instanceOutputMode'
            )
        },

        // Testbench 相关命令
        {
            id: 'verilog-testbench-plus.generateTestbench',
            handler: createGenerateHandler(
                context,
                templateManager,
                GenerationType.Testbench,
                OutputMode.NewDocument
            )
        },
        {
            id: 'verilog-testbench-plus.generateTestbenchToClipboard',
            handler: createGenerateHandler(
                context,
                templateManager,
                GenerationType.Testbench,
                OutputMode.Clipboard
            )
        },
        {
            id: 'verilog-testbench-plus.generateTestbenchToFileOverwrite',
            handler: createGenerateHandler(
                context,
                templateManager,
                GenerationType.Testbench,
                OutputMode.FileOverwrite
            )
        },
        {
            id: 'verilog-testbench-plus.generateTestbenchToFileAppend',
            handler: createGenerateHandler(
                context,
                templateManager,
                GenerationType.Testbench,
                OutputMode.FileAppend
            )
        },
        {
            id: 'verilog-testbench-plus.generateTestbenchGeneral',
            handler: createGeneralHandler(
                context,
                templateManager,
                GenerationType.Testbench,
                'testbenchOutputMode'
            )
        },

        // 模板管理命令
        {
            id: 'verilog-testbench-plus.createInstanceTemplate',
            handler: () => templateManager.createTemplate(GenerationType.Instance)
        },
        {
            id: 'verilog-testbench-plus.createTestbenchTemplate',
            handler: () => templateManager.createTemplate(GenerationType.Testbench)
        },
        {
            id: 'verilog-testbench-plus.editInstanceTemplate',
            handler: () => templateManager.editTemplate(GenerationType.Instance)
        },
        {
            id: 'verilog-testbench-plus.editTestbenchTemplate',
            handler: () => templateManager.editTemplate(GenerationType.Testbench)
        },
        {
            id: 'verilog-testbench-plus.deleteInstanceTemplate',
            handler: () => templateManager.deleteTemplate(GenerationType.Instance)
        },
        {
            id: 'verilog-testbench-plus.deleteTestbenchTemplate',
            handler: () => templateManager.deleteTemplate(GenerationType.Testbench)
        },
        {
            id: 'verilog-testbench-plus.selectInstanceTemplate',
            handler: () => templateManager.selectTemplate(GenerationType.Instance)
        },
        {
            id: 'verilog-testbench-plus.selectTestbenchTemplate',
            handler: () => templateManager.selectTemplate(GenerationType.Testbench)
        }
    ];
}