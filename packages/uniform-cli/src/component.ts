import { bold, green, red } from 'kleur/colors';
import tty from 'node:tty';

import { ComponentConfig, getDeps, mergeComponentConfigs, resolveDeps } from './componentConfig';
import { GlobalOptions, execShellInteractive, execShellToString, substVars } from './core';
import { Workspace } from './workspace';

export interface Component {
    name: string;
    config: ComponentConfig;
    workspace: Workspace;

    template?: ComponentConfig;
    justStarted?: boolean;
    context?: Map<string, string>;
}

export const initComponent = async (component: Component) => {
    const ctx = new Map(component.workspace.context);

    ctx.set('APP_NAME', component.name);
    ctx.set('COMPOSE_PROJECT_NAME', `${component.workspace.config?.name}-${component.name}`);
    ctx.set('COMPOSE_PROJECT_NAME', `${component.workspace.config?.name}-${component.name}`);

    const svcPath = substVars(component.config.path!, ctx);
    ctx.set('SVC_PATH', svcPath);

    if (component.config.extends) {
        const template = component.workspace.config!.components.get(component.config.extends);

        if (!template)
            throw new Error(
                `Error extending component ${component.name} from ${component.config.extends}: ${
                    component.config.extends
                } is not defined. Known components: ${[...component.workspace.config!.components.keys()].join(', ')}`
            );

        component.template = template;

        const templatePath = substVars(template.path!, ctx);

        ctx.set('TPL_PATH', templatePath);

        if (!template.composeFile) {
            template.composeFile = '${TPL_PATH}/docker-compose.yml';
        }

        const composeFile = substVars(template.composeFile!, ctx);
        ctx.set('COMPOSE_FILE', composeFile);

        for (const [key, v] of Object.entries(template.variables)) {
            const value = substVars(v, ctx);
            ctx.set(key, value);
        }
    }

    if (component.config.composeFile) {
        const composeFile = substVars(component.config.composeFile, ctx);
        ctx.set('COMPOSE_FILE', composeFile);
    }

    if (!component.config.composeFile && !ctx.has('COMPOSE_FILE')) {
        const composeFile = substVars(`\${SVC_PATH}/docker-compose.yml`, ctx);
        ctx.set('COMPOSE_FILE', composeFile);
    }

    const vars = typeof component.config?.variables === 'object' ? Object.entries(component.config.variables) : [];

    for (const [key, val] of vars) {
        const value = substVars(val, ctx);
        ctx.set(key, value);
    }

    component.context = ctx;
};

export const componentExecCompose = async (
    comp: Component,
    composeCommand: string[],
    options: GlobalOptions,
    interactive = false
) => {
    const composeFile = comp.context!.get('COMPOSE_FILE');

    const command = ['docker', 'compose', '-f', composeFile, ...composeCommand];
    const commandStr = command.join(' ');

    if (options.debug) {
        console.log(`>> ${interactive ? '(interactive)' : ''}${commandStr}`);
    }

    if (options.dryRun) return '';

    const env: Record<string, any> = {};

    for (const [k, v] of comp.context!.entries()) {
        env[k] = v;
    }

    if (options.debug) {
        console.log('>> ENV:', env);
    }

    if (interactive) {
        await execShellInteractive(commandStr, comp.workspace.cwd, env);

        return '';
    }

    return execShellToString(commandStr, comp.workspace.cwd, env);
};

export const componentExec = async (
    comp: Component,
    command: string[],
    options: GlobalOptions,
    interactive = false
) => {
    const commandStr = command.join(' ');

    if (options.debug) {
        console.log(`>> ${commandStr}`);
    }

    if (options.dryRun) return '';

    const env: Record<string, any> = {};

    for (const [k, v] of comp.context!.entries()) {
        env[k] = v;
    }

    if (interactive) {
        await execShellInteractive(commandStr, comp.workspace.cwd, env);
        return '';
    }

    return execShellToString(commandStr, comp.workspace.cwd, env);
};

export const componentIsRunning = async (comp: Component, options: GlobalOptions) => {
    const out = await componentExecCompose(comp, ['ps', '--status=running', '-q'], options);
    return out !== '';
};

export const componentStart = async (comp: Component, options: GlobalOptions) => {
    const running = await componentIsRunning(comp, options);

    console.log('starting component: ', comp.name, 'is it running?', running);

    if (!running || options.force) {
        const deps = getDeps(comp.config, options.mode || 'default');
        const comps = resolveDeps(comp.workspace, deps);

        console.log(red('   deps: ' + comps.map(e => e.name).join(',')));

        for (const comp of comps) {
            const running = await componentIsRunning(comp, options);

            if (!running || options.force) {
                await componentExecCompose(comp, ['up', '-d'], options, true);
            }
        }
    }

    if (!running) {
        return componentExecCompose(comp, ['up', '-d'], options, true);
    } else {
        console.log(bold(green(`🚀 Component "${comp.name}" is already running`)));
    }
};

export const componentStop = async (comp: Component, options: GlobalOptions) => {
    const running = await componentIsRunning(comp, options);

    if (!running) return;

    await componentExecCompose(comp, ['stop'], options, true);
};

export const componentDestroy = async (comp: Component, options: GlobalOptions) => {
    const running = await componentIsRunning(comp, options);

    if (!running) return;

    return componentExecCompose(comp, ['down'], options, true);
};

export const componentRestart = async (comp: Component, hard: boolean, options: GlobalOptions) => {
    if (hard) {
        await componentDestroy(comp, options);
    } else {
        await componentStop(comp, options);
    }

    return componentStart(comp, {});
};

export const componentCompose = async (comp: Component, options: GlobalOptions) => {
    return componentExecCompose(comp, options.cmd!, options, true);
};

export const componentExecOptions = async (comp: Component, options: GlobalOptions) => {
    await componentStart(comp, options);

    const command = ['exec'];

    if (options.workingDir) {
        command.push(...['-w', options.workingDir]);
    }

    if (typeof options.UID === 'number') {
        command.push(...['-u', `${options.UID}`]);
    } else {
        const userId = comp.context!.get('USER_ID');
        if (!userId) throw new Error('variable "USER_ID" is not set');

        const groupId = comp.context!.get('GROUP_ID');
        if (!groupId) throw new Error('variable "GROUP_ID" is not set');

        command.push(...['-u', `${userId}:${groupId}`]);
    }

    if (options.noTty || !tty.isatty(process.stdout.fd)) {
        command.push('-T');
    }

    command.push('app');
    command.push(...options.cmd!);

    return componentExecCompose(comp, command, options, true);
};
