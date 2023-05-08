import { Component } from './component';
import { Mode } from './core';
import { Workspace } from './workspace';

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

    for (const [k, v] of cc2.variables) {
        result.variables.set(k, v);
    }

    result.tags = [...(result.tags || []), ...(cc2.tags || [])];

    if (cc2.dependencies) {
        for (const [depSvc, modes] of Object.entries(cc2.dependencies)) {
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

    for (const [key, modes] of Object.entries(cc.dependencies)) {
        if (modes.includes(mode)) {
            result.push(key);
        }
    }

    return result;
};

export const resolveDeps = (workspace: Workspace, deps: string[]) => {
    let components: Component[] = [];

    for (const dep of deps) {
        const comp = workspace.components.get(dep);

        if (!comp) throw new Error(`Could not find component "${dep}"`);

        components.push(comp);

        if (
            comp.config.dependencies &&
            typeof comp.config.dependencies === 'object' &&
            Object.entries(comp.config.dependencies).length > 0
        ) {
            components = [...resolveDeps(workspace, Object.keys(comp.config.dependencies)), ...components];
        }
    }

    return components;
};
