import { exec, spawn } from 'child_process';
import yargs from 'yargs';

export type Mode = 'default' | 'hook';

export interface GlobalOptions {
    workspaceName?: string;
    debug?: boolean;
    cmd?: string[];
    force?: boolean;
    mode?: Mode;
    workingDir?: string;
    UID?: number;
    tag?: string;
    dryRun?: boolean;
    noTty?: boolean;
}

interface Dict<T> {
    [key: string]: T | undefined;
}

export function env(content: string, variables: Dict<string>) {
    // https://regex101.com/r/k9saS6/2
    // Yes:
    //  ${NAME:DEFAULT}
    //  ${NAME:"DEFAULT"}
    //  ${NAME}
    // Not:
    //  ${NAME:}

    const R = /\$\{([A-Z0-9_]+(\:[^\}]+)?)\}/gi;

    return content.replace(R, (_, result: string) => {
        let [name, value, ...rest] = result.split(':');

        if (value) {
            if (rest && rest.length) {
                value = [value, ...rest].join(':');
            }

            value = value.trim();

            if (value.startsWith('$')) {
                value = variables[value.replace('$', '')] || '';
            } else if (value.startsWith(`"`)) {
                value = value.replace(/^\"([^\"]+)\"$/g, '$1');
            } else if (value.startsWith(`'`)) {
                value = value.replace(/^\'([^\']+)\'$/g, '$1');
            }
        }

        return variables[name] ? String(variables[name]) : value;
    });
}

export const substVars = (expr: string, ctx: Map<string, string>) => {
    const ctxDict: Record<string, string> = {};

    for (const [k, v] of ctx) {
        ctxDict[k] = v;
    }

    return env(expr, ctxDict);
};

export const generateHookScript = (scripts: string[], uniformBinary: string) => {
    const result = [];

    result.push('#!/bin/bash');
    result.push('set -e');
    result.push(`printf "\x1b[0;34m%s\x1b[39;49;00m\n" "Run hook in Uniform CLI"`);

    for (const script of scripts) {
        result.push(`${uniformBinary} --mode=hook --no-tty ${script}`);
    }

    return result.join('\n');
};

/**
 * Executes a shell command and return it as a Promise.
 */
export async function execShellToString(cmd: string, cwd: string, env: Record<string, string>) {
    return new Promise<string>((resolve, reject) => {
        exec(cmd, { env: { ...process.env, ...env }, cwd }, (error, stdout) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}

/**
 * Executes a shell command, sends all data to stdout and stderr.
 */
export async function execShellInteractive(cmd: string, cwd: string, env: Record<string, string>) {
    return new Promise<number | null>((resolve, reject) => {
        const shell = spawn(cmd, {
            stdio: 'inherit',
            shell: true,
            cwd,
            env: { ...process.env, ...env },
        });

        shell.on('close', code => resolve(code));
        shell.on('error', err => reject(err));
    });
}

export const yargsAddGlobalOptions = (yargs: yargs.Argv<GlobalOptions>) =>
    yargs
        .option('debug', {
            type: 'boolean',
            default: false,
            description: 'print debug messages',
        })
        .option('dry-run', {
            alias: 'dryRun',
            default: false,
            type: 'boolean',
            description: 'do not execute a real command, only print',
        })
        .option('uid', {
            type: 'number',
            default: 0,
            description: 'use another uid, by default uses uid of current user',
        })
        .option('no-tty', {
            alias: 'noTty',
            type: 'boolean',
            default: false,
            description: 'disable pseudo-TTY allocation',
        });
