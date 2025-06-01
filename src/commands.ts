import * as vscode from 'vscode';
import { OutputMode, GenerationType, GenerateOptions } from './types';
import { generateCode } from './generator';
import { TemplateManager } from './templateManager';

const l10n = vscode.l10n;

/**
 * 命令配置
 */
interface CommandConfig {
    id: string;
    handler: () => void | Promise<void>;
}

/**
 * 生成类型配置
 */
interface GenerationTypeConfig {
    type: GenerationType;
    prefix: string;
    configKey: string;
}

/**
 * 输出模式配置
 */
interface OutputModeConfig {
    mode: OutputMode;
    suffix: string;
}

/**
 * 模板操作配置
 */
interface TemplateActionConfig {
    action: string;
    handler: (templateManager: TemplateManager) => void | Promise<void>;
}

// 生成类型配置
const GENERATION_TYPES: GenerationTypeConfig[] = [
    {
        type: GenerationType.Instance,
        prefix: 'generateInstance',
        configKey: 'instanceOutputMode'
    },
    {
        type: GenerationType.Testbench,
        prefix: 'generateTestbench',
        configKey: 'testbenchOutputMode'
    }
];

// 输出模式配置
const OUTPUT_MODES: OutputModeConfig[] = [
    { mode: OutputMode.NewDocument, suffix: 'ToNewDocument' },
    { mode: OutputMode.Clipboard, suffix: 'ToClipboard' },
    { mode: OutputMode.FileOverwrite, suffix: 'ToFileOverwrite' },
    { mode: OutputMode.FileAppend, suffix: 'ToFileAppend' }
];

// 模板操作配置 - 修改为统一的操作，不区分类型
const TEMPLATE_ACTIONS: TemplateActionConfig[] = [
    {
        action: 'createTemplate',
        handler: async (tm) => {
            const type = await tm.selectGenerationType();
            if (type) await tm.createTemplate(type);
        }
    },
    {
        action: 'editTemplate',
        handler: async (tm) => {
            const type = await tm.selectGenerationType();
            if (type) await tm.editTemplate(type);
        }
    },
    {
        action: 'deleteTemplate',
        handler: async (tm) => {
            const type = await tm.selectGenerationType();
            if (type) await tm.deleteTemplate(type);
        }
    },
    {
        action: 'selectTemplate',
        handler: async (tm) => {
            const type = await tm.selectGenerationType();
            if (type) await tm.selectTemplate(type);
        }
    }
];



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
 * 生成特定输出模式的命令
 */
function generateOutputCommands(
    context: vscode.ExtensionContext,
    templateManager: TemplateManager,
    genConfig: GenerationTypeConfig,
    outputConfig: OutputModeConfig
): CommandConfig {
    return {
        id: `verilog-testbench-plus.${genConfig.prefix}${outputConfig.suffix}`,
        handler: createGenerateHandler(
            context,
            templateManager,
            genConfig.type,
            outputConfig.mode
        )
    };
}

/**
 * 生成通用命令
 */
function generateGeneralCommand(
    context: vscode.ExtensionContext,
    templateManager: TemplateManager,
    genConfig: GenerationTypeConfig
): CommandConfig {
    return {
        id: `verilog-testbench-plus.${genConfig.prefix}General`,
        handler: createGeneralHandler(
            context,
            templateManager,
            genConfig.type,
            genConfig.configKey
        )
    };
}

/**
 * 生成模板管理命令
 */
function generateTemplateCommand(
    templateManager: TemplateManager,
    actionConfig: TemplateActionConfig
): CommandConfig {
    return {
        id: `verilog-testbench-plus.${actionConfig.action}`,
        handler: () => actionConfig.handler(templateManager)
    };
}

/**
 * 获取所有命令配置
 */
export function getCommands(context: vscode.ExtensionContext): CommandConfig[] {
    const templateManager = new TemplateManager(context);
    const commands: CommandConfig[] = [];

    // 生成所有代码生成命令
    for (const genConfig of GENERATION_TYPES) {
        // 为每种输出模式生成命令
        for (const outputConfig of OUTPUT_MODES) {
            commands.push(
                generateOutputCommands(context, templateManager, genConfig, outputConfig)
            );
        }

        // 生成通用命令
        commands.push(
            generateGeneralCommand(context, templateManager, genConfig)
        );
    }

    // 生成模板管理命令 - 只生成4个统一的命令
    for (const actionConfig of TEMPLATE_ACTIONS) {
        commands.push(
            generateTemplateCommand(templateManager, actionConfig)
        );
    }

    return commands;
}