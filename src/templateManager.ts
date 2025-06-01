import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { GenerationType } from './types';

const l10n = vscode.l10n;

export class TemplateManager {
    private customTemplatesPath: string;
    private defaultTemplatesPath: string;

    constructor(context: vscode.ExtensionContext) {
        // 默认模板路径
        this.defaultTemplatesPath = path.join(context.extensionPath, 'templates');

        // 自定义模板路径（在用户的全局存储目录中）
        this.customTemplatesPath = path.join(context.globalStorageUri.fsPath, 'templates');

        // 确保自定义模板目录存在
        this.ensureCustomTemplatesDir();
    }

    /**
     * 确保自定义模板目录存在
     */
    private ensureCustomTemplatesDir(): void {
        if (!fs.existsSync(this.customTemplatesPath)) {
            fs.mkdirSync(this.customTemplatesPath, { recursive: true });
        }
    }

    /**
     * 获取所有可用的模板
     */
    public getAvailableTemplates(type: GenerationType): string[] {
        const templates: string[] = [];
        const suffix = type === GenerationType.Instance ? '_instance' : '_testbench';

        // 获取默认模板
        const defaultTemplates = this.getTemplatesFromDir(this.defaultTemplatesPath, suffix);
        templates.push(...defaultTemplates.map(t => `[Default] ${t}`));

        // 获取自定义模板
        const customTemplates = this.getTemplatesFromDir(this.customTemplatesPath, suffix);
        templates.push(...customTemplates);

        return templates;
    }

    /**
     * 从目录获取模板文件
     */
    private getTemplatesFromDir(dir: string, suffix: string): string[] {
        if (!fs.existsSync(dir)) return [];

        const files = fs.readdirSync(dir);
        return files
            .filter(f => f.endsWith('.template') && f.includes(suffix))
            .map(f => path.basename(f, '.template'));
    }

    /**
     * 创建新模板
     */
    public async createTemplate(type: GenerationType): Promise<void> {
        // 获取模板名称
        const templateName = await vscode.window.showInputBox({
            prompt: l10n.t('Enter template name'),
            placeHolder: l10n.t('my_custom_template'),
            validateInput: (value) => {
                if (!value) return l10n.t('Template name cannot be empty');
                if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
                    return l10n.t('Template name can only contain letters, numbers, underscores and hyphens');
                }
                return null;
            }
        });

        if (!templateName) return;

        // 构建文件名
        const suffix = type === GenerationType.Instance ? '_instance' : '_testbench';
        const fileName = `${templateName}${suffix}.template`;
        const filePath = path.join(this.customTemplatesPath, fileName);

        // 检查文件是否已存在
        if (fs.existsSync(filePath)) {
            vscode.window.showErrorMessage(l10n.t('Template {0} already exists', fileName));
            return;
        }

        // 复制默认模板内容
        const defaultTemplateName = type === GenerationType.Instance
            ? 'instance.template'
            : 'testbench.template';
        const defaultTemplatePath = path.join(this.defaultTemplatesPath, defaultTemplateName);
        const defaultContent = fs.readFileSync(defaultTemplatePath, 'utf8');

        // 创建新模板文件
        fs.writeFileSync(filePath, defaultContent, 'utf8');

        // 打开新创建的模板文件
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc);

        vscode.window.showInformationMessage(
            l10n.t('Template {0} created successfully', fileName)
        );
    }

    /**
     * 编辑模板
     */
    public async editTemplate(type: GenerationType): Promise<void> {
        const templates = this.getAvailableTemplates(type);

        if (templates.length === 0) {
            vscode.window.showWarningMessage(l10n.t('No templates available'));
            return;
        }

        const selected = await vscode.window.showQuickPick(templates, {
            placeHolder: l10n.t('Select template to edit')
        });

        if (!selected) return;

        const templatePath = this.getTemplatePath(selected, type);
        if (templatePath) {
            const doc = await vscode.workspace.openTextDocument(templatePath);
            await vscode.window.showTextDocument(doc);
        }
    }

    /**
     * 删除模板
     */
    public async deleteTemplate(type: GenerationType): Promise<void> {
        // 只获取自定义模板（默认模板不能删除）
        const suffix = type === GenerationType.Instance ? '_instance' : '_testbench';
        const customTemplates = this.getTemplatesFromDir(this.customTemplatesPath, suffix);

        if (customTemplates.length === 0) {
            vscode.window.showWarningMessage(l10n.t('No custom templates to delete'));
            return;
        }

        const selected = await vscode.window.showQuickPick(customTemplates, {
            placeHolder: l10n.t('Select template to delete')
        });

        if (!selected) return;

        // 确认删除
        const confirm = await vscode.window.showWarningMessage(
            l10n.t('Are you sure you want to delete template {0}?', selected),
            { modal: true },
            l10n.t('Delete')
        );

        if (confirm !== l10n.t('Delete')) return;

        const filePath = path.join(this.customTemplatesPath, `${selected}.template`);

        try {
            fs.unlinkSync(filePath);
            vscode.window.showInformationMessage(
                l10n.t('Template {0} deleted successfully', selected)
            );

            // 修复：重置所有配置作用域中的模板引用
            const config = vscode.workspace.getConfiguration('verilog-testbench-plus');
            const configKey = type === GenerationType.Instance
                ? 'selectedInstanceTemplate'
                : 'selectedTestbenchTemplate';

            const inspection = config.inspect<string>(configKey);

            // 重置所有作用域中的配置
            const resetPromises: Promise<void>[] = [];

            // 重置全局作用域
            if (inspection?.globalValue === selected) {
                resetPromises.push(Promise.resolve(config.update(configKey, undefined, vscode.ConfigurationTarget.Global)));
            }

            // 重置工作区作用域
            if (inspection?.workspaceValue === selected) {
                resetPromises.push(Promise.resolve(config.update(configKey, undefined, vscode.ConfigurationTarget.Workspace)));
            }

            // 重置工作区文件夹作用域
            if (inspection?.workspaceFolderValue === selected) {
                resetPromises.push(Promise.resolve(config.update(configKey, undefined, vscode.ConfigurationTarget.WorkspaceFolder)));
            }

            // 等待所有重置操作完成
            await Promise.all(resetPromises);
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(
                l10n.t('Failed to delete template: {0}', errMsg)
            );
        }
    }

    /**
     * 选择模板类型
     */
    public async selectGenerationType(): Promise<GenerationType | undefined> {
        const items = [
            {
                label: l10n.t('Instance'),
                description: l10n.t('Manage Instance templates'),
                type: GenerationType.Instance
            },
            {
                label: l10n.t('Testbench'),
                description: l10n.t('Manage Testbench templates'),
                type: GenerationType.Testbench
            }
        ];

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: l10n.t('Select template type')
        });

        return selected?.type;
    }

    /**
     * 选择模板
     */
    public async selectTemplate(type: GenerationType): Promise<void> {
        const templates = this.getAvailableTemplates(type);

        // 添加"使用默认"选项
        const options = ['[Use Default]', ...templates];

        const selected = await vscode.window.showQuickPick(options, {
            placeHolder: l10n.t('Select template to use for {0}', l10n.t(type))
        });

        if (selected === undefined) return;

        // 询问保存位置
        const saveLocation = await this.askSaveLocation();
        if (saveLocation === undefined) return;

        const config = vscode.workspace.getConfiguration('verilog-testbench-plus');
        const configKey = type === GenerationType.Instance
            ? 'selectedInstanceTemplate'
            : 'selectedTestbenchTemplate';

        if (selected === '[Use Default]') {
            await config.update(configKey, undefined, saveLocation);
            vscode.window.showInformationMessage(
                l10n.t('Using default template for {0}', l10n.t(type))
            );
        } else {
            await config.update(configKey, selected, saveLocation);
            vscode.window.showInformationMessage(
                l10n.t('Selected template {0} for {1}', selected, l10n.t(type))
            );
        }
    }

    /**
     * 询问配置保存位置
     */
    private async askSaveLocation(): Promise<vscode.ConfigurationTarget | undefined> {
        interface SaveLocationOption {
            label: string;
            description: string;
            target: vscode.ConfigurationTarget;
        }

        const options: SaveLocationOption[] = [
            {
                label: l10n.t('User Settings'),
                description: l10n.t('Save globally for all projects'),
                target: vscode.ConfigurationTarget.Global
            }
        ];

        // 只有在工作区中才显示工作区和文件夹选项
        if (vscode.workspace.workspaceFolders) {
            options.push({
                label: l10n.t('Workspace Settings'),
                description: l10n.t('Save for the current workspace'),
                target: vscode.ConfigurationTarget.Workspace
            });

            // 如果有多个文件夹，显示文件夹选项
            if (vscode.workspace.workspaceFolders.length > 1) {
                options.push({
                    label: l10n.t('Folder Settings'),
                    description: l10n.t('Save for the current folder'),
                    target: vscode.ConfigurationTarget.WorkspaceFolder
                });
            }
        }

        const selected = await vscode.window.showQuickPick(options, {
            placeHolder: l10n.t('Select where to save this setting'),
            ignoreFocusOut: false
        });

        return selected?.target;
    }

    /**
     * 获取当前选中的模板路径
     */
    public getSelectedTemplatePath(type: GenerationType): string {
        const config = vscode.workspace.getConfiguration('verilog-testbench-plus');
        const configKey = type === GenerationType.Instance
            ? 'selectedInstanceTemplate'
            : 'selectedTestbenchTemplate';
        const selected = config.get<string>(configKey);

        if (!selected) {
            // 使用默认模板
            const defaultName = type === GenerationType.Instance
                ? 'instance.template'
                : 'testbench.template';
            return path.join(this.defaultTemplatesPath, defaultName);
        }

        const templatePath = this.getTemplatePath(selected, type);
        if (templatePath && fs.existsSync(templatePath)) {
            return templatePath;
        }

        // 如果找不到选中的模板，回退到默认模板
        const defaultName = type === GenerationType.Instance
            ? 'instance.template'
            : 'testbench.template';
        return path.join(this.defaultTemplatesPath, defaultName);
    }

    /**
     * 获取模板文件路径
     */
    private getTemplatePath(templateName: string, type: GenerationType): string | null {
        const suffix = type === GenerationType.Instance ? '_instance' : '_testbench';

        if (templateName.startsWith('[Default] ')) {
            const name = templateName.replace('[Default] ', '');
            return path.join(this.defaultTemplatesPath, `${name}.template`);
        } else {
            return path.join(this.customTemplatesPath, `${templateName}.template`);
        }
    }
}