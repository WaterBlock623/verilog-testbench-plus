import * as vscode from 'vscode';
import { TemplateManager } from './templateManager';

/**
 * 输出模式枚举
 */
export enum OutputMode {
    NewDocument = 'newDocument',
    Clipboard = 'clipboard',
    FileOverwrite = 'fileOverwrite',
    FileAppend = 'fileAppend'
}

/**
 * 生成类型枚举
 */
export enum GenerationType {
    Instance = 'Instance',
    Testbench = 'Testbench'
}

/**
 * 模块信息接口
 */
export interface ModuleInfo {
    name: string;
    parameters: Parameter[];
    inputs: Port[];
    outputs: Port[];
    inouts: Port[];
}

/**
 * 参数接口
 */
export interface Parameter {
    name: string;
    value: string;
}

/**
 * 端口接口
 */
export interface Port {
    name: string;
    range: string;
}

/**
 * 生成选项接口
 */
export interface GenerateOptions {
    context: vscode.ExtensionContext;
    templateManager: TemplateManager;
    type: GenerationType;
    outputMode: OutputMode;
}