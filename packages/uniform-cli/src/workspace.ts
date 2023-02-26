import { existsSync } from 'fs';
import { join } from 'path';

import { Component, initComponent } from './component';
import { ComponentConfig, ModeList } from './componentConfig';
import { substVars } from './core';
import { WorkspaceConfig, loadWorkspaceConfig, mergeWorkspaceConfig } from './workspaceConfig';

export interface Workspace {
    aliases: Map<string, string>;
    configPath: string;
    config?: WorkspaceConfig;
    cwd: string;

    context: Map<string, string>;

    components: Map<string, Component>;
}

export const createWorkspace = (wsPath: string, cwd: string): Workspace => ({
    aliases: new Map<string, string>(),
    components: new Map<string, Component>(),
    cwd,
    configPath: wsPath,
    context: new Map<string, string>(),
});

export const createWorkspaceContext = (ws: Workspace) => {
    const ctx = new Map<string, string>();

    ctx.set('WORKSPACE_PATH', ws.configPath);
    ctx.set('WORKSPACE_NAME', ws.config!.name || '');

    for (const pair of ws.config!.variables) {
        const value = substVars(pair[1], ctx);

        ctx.set(pair[0], value);
    }

    return ctx;
};

export const loadWorkspace = async (ws: Workspace) => {
    let wsc = await loadWorkspaceConfig(join(ws.configPath, 'uniform.json'));

    const envPath = join(ws.configPath, 'env.json');

    if (existsSync(envPath)) {
        const envWsc = await loadWorkspaceConfig(envPath);

        wsc = mergeWorkspaceConfig(wsc, envWsc);
    }

    ws.config = wsc;
};

export const initWorkspace = async (ws: Workspace) => {
    const ctx = createWorkspaceContext(ws);

    ws.context = ctx;

    for (const [compName, compCfg] of ws.config!.components) {
        ws.components.set(compName, {
            name: compName,
            config: {
                tags: [],
                variables: new Map<string, string>(),
                dependencies: new Map<string, ModeList>(),
                ...(compCfg as Partial<ComponentConfig>),
            },
            workspace: ws,
        });
    }

    for (const [_, comp] of ws.components) {
        await initComponent(comp);
    }
};
