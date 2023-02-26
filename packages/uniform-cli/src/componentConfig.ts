import { Mode } from './core';

export type ModeList = Mode[];

export interface ComponentConfig {
    alias?: string;
    composeFile?: string;
    dependencies: Map<string, ModeList>;
    execPath?: string;
    extends?: string;
    hostedIn?: string;
    hostname?: string;
    isTemplate?: boolean;
    path?: string;
    replace?: boolean;
    variables: Map<string, string>;
    repository?: string;
    tags?: string[];
    afterCloneHook?: string;
}

export const mergeComponentConfigs = (cc: ComponentConfig, cc2: ComponentConfig) => {
    if (cc2.replace) return { ...cc2 };

    const result = { ...cc };

    const replacable: (keyof ComponentConfig)[] = [
        'path',
        'composeFile',
        'extends',
        'hostedIn',
        'execPath',
        'alias',
        'repository',
        'afterCloneHook',
    ];

    for (const key of replacable) {
        if (cc2[key]) (result as any)[key] = cc2[key];
    }

    for (const [k, v] of result.variables) {
        result.variables.set(k, v);
    }

    result.tags = [...(result.tags || []), ...(cc2.tags || [])];

    if (cc2.dependencies) {
        for (const [depSvc, modes] of cc2.dependencies.entries()) {
            if (!result.dependencies.has(depSvc)) {
                result.dependencies.set(depSvc, new Array<Mode>());
            }

            for (const mode of modes) {
                if (!result.dependencies.get(depSvc)?.includes(mode)) {
                    result.dependencies.get(depSvc)?.push(mode);
                }
            }
        }
    }

    return result;
};

export const getDeps = (cc: ComponentConfig, mode: Mode) => {
    const result: string[] = [];

    for (const [key, modes] of cc.dependencies.entries()) {
        if (modes.includes(mode)) {
            result.push(key);
        }
    }

    return result;
};
