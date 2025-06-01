import { ModuleInfo, Parameter, Port } from './types';

/**
 * 替换模板中的占位符
 */
export function replaceTemplate(template: string, info: ModuleInfo): string {
    let result = template;

    // 替换模块名
    result = result.replace(/\${MODULE_NAME}/g, info.name);

    // 生成并替换各部分
    result = result.replace(/\${PARAMETER_DECLARATION}/g, generateParameterDeclaration(info.parameters));
    result = result.replace(/\${PARAMETER_DEFINITION}/g, generateParameterDefinition(info.parameters));
    result = result.replace(/\${INPUT_DECLARATION}/g, generatePortDeclaration(info.inputs, 'reg'));
    result = result.replace(/\${OUTPUT_DECLARATION}/g, generatePortDeclaration(info.outputs, 'wire'));
    result = result.replace(/\${INOUT_DECLARATION}/g, generatePortDeclaration(info.inouts, 'wire'));
    result = result.replace(/\${PORT_CONNECTION}/g, generatePortConnection(info));

    // 清理多余的空行
    result = result.replace(/\n\s*\n\s*\n/g, '\n\n');

    return result;
}

/**
 * 生成参数声明（用于testbench）
 */
function generateParameterDeclaration(params: Parameter[]): string {
    if (params.length === 0) return '';

    const maxNameLen = Math.max(...params.map(p => p.name.length));
    const maxValueLen = Math.max(...params.map(p => p.value.length));

    return params.map(p =>
        `parameter ${p.name.padEnd(maxNameLen)} = ${p.value.padEnd(maxValueLen)};`
    ).join('\n');
}

/**
 * 生成参数定义（用于实例化）
 */
function generateParameterDefinition(params: Parameter[]): string {
    if (params.length === 0) return '';

    const maxLen = Math.max(...params.map(p => p.name.length));
    const lines = params.map(p =>
        `    .${p.name.padEnd(maxLen)}(${p.name.padEnd(maxLen)})`
    );

    return '#(\n' + lines.join(',\n') + '\n)';
}

/**
 * 生成端口声明
 */
function generatePortDeclaration(ports: Port[], portType: string): string {
    if (ports.length === 0) return '';

    const maxNameLength = Math.max(...ports.map(p => p.name.length));
    const maxRangeLength = Math.max(...ports.map(p => p.range ? p.range.length : 0), 0);

    return ports.map(p => {
        const rangeStr = portType === 'reg'
            ? (p.range ? `${p.range}`.padEnd(maxRangeLength + 1) : ''.padEnd(maxRangeLength + 1))
            : (''.padEnd(maxRangeLength));

        const initValue = portType === 'reg' ? ' = 0' : '';

        return [
            portType.padEnd(5),
            rangeStr,
            p.name.padEnd(maxNameLength),
            initValue + ';',
        ].join('');
    }).join('\n');
}

/**
 * 生成端口连接（用于实例化）
 */
function generatePortConnection(info: ModuleInfo): string {
    const allPorts = [...info.inputs, ...info.outputs, ...info.inouts];
    if (allPorts.length === 0) return '';

    const maxNameLen = Math.max(...allPorts.map(p => p.name.length));
    const groups: string[][] = [];

    // 按类型分组
    if (info.inputs.length > 0) {
        groups.push(info.inputs.map(p =>
            `    .${p.name.padEnd(maxNameLen)}(${p.name.padEnd(maxNameLen)})`
        ));
    }

    if (info.outputs.length > 0) {
        groups.push(info.outputs.map(p =>
            `    .${p.name.padEnd(maxNameLen)}(${p.name.padEnd(maxNameLen)})`
        ));
    }

    if (info.inouts.length > 0) {
        groups.push(info.inouts.map(p =>
            `    .${p.name.padEnd(maxNameLen)}(${p.name.padEnd(maxNameLen)})`
        ));
    }

    return groups
        .map(group => group.join(',\n'))
        .join(',\n\n');
}