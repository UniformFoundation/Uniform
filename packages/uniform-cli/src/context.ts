import { isAbsolute, resolve } from 'path';

import { Context } from './types';

export const resolvePath = (absoluteOrRelativePath: string, relativeTo = process.cwd()) => {
    if (isAbsolute(absoluteOrRelativePath)) return absoluteOrRelativePath;

    return resolve(relativeTo, absoluteOrRelativePath).replace(/\\/g, '/');
};

function getUserPkgManager() {
    // This environment variable is set by npm and yarn but pnpm seems less consistent
    const userAgent = process.env.npm_config_user_agent;

    if (userAgent) {
        if (userAgent.startsWith('yarn')) {
            return 'yarn';
        } else if (userAgent.startsWith('pnpm')) {
            return 'pnpm';
        } else {
            return 'npm';
        }
    } else {
        // If no user agent is set, assume npm
        return 'npm';
    }
}

export const loadContext = async (): Promise<Context> => {
    const yargs = process.argv.slice(2);

    return {
        yargs: yargs,
        packageManager: getUserPkgManager(),
    };
};
