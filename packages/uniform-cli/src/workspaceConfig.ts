import { readFile } from 'fs/promises';

import { ComponentConfig, mergeComponentConfigs } from './componentConfig';

export interface WorkspaceConfig {
    name?: string;
    components: Map<string, ComponentConfig>;
    variables: Map<string, string>;
}

export const mergeWorkspaceConfig = (wsc: WorkspaceConfig, wsc2: WorkspaceConfig) => {
    const result = { ...wsc };

    for (const [name, cc] of wsc2.components) {
        if (!result.components.has(name)) {
            result.components.set(name, cc);
        } else {
            result.components.set(name, mergeComponentConfigs(result.components.get(name)!, cc));
        }
    }

    for (const [k, v] of wsc2.variables) {
        result.variables.set(k, v);
    }

    return result;
};

export const loadWorkspaceConfig = async (wscPath: string) => {
    const file = await readFile(wscPath, 'utf-8');
    const data = JSON.parse(file);

    const result: WorkspaceConfig = {
        components: new Map<string, ComponentConfig>(),
        variables: new Map<string, string>(),
        name: (data.name as string) || undefined,
    };

    if (typeof data.components === 'object') {
        for (const [key, value] of Object.entries(data.components as Record<string, any>)) {
            result.components.set(key, value);
        }
    }

    if (typeof data.variables === 'object') {
        for (const [key, value] of Object.entries(data.variables as Record<string, any>)) {
            result.variables.set(key, value);
        }
    }

    return result;
};
