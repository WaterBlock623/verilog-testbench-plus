import * as vscode from 'vscode';
import { getCommands } from './commands';

/**
 * 扩展激活函数
 */
export function activate(context: vscode.ExtensionContext) {
    // 获取所有命令配置
    const commands = getCommands(context);

    // 注册所有命令
    commands.forEach(cmd => {
        const disposable = vscode.commands.registerCommand(cmd.id, cmd.handler);
        context.subscriptions.push(disposable);
    });
}

/**
 * 扩展停用函数
 */
export function deactivate() {
}