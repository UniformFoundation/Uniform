import type { Arguments, CommandBuilder } from 'yargs';

import { componentStart } from '../component';
import { GlobalOptions, Mode, yargsAddGlobalOptions } from '../core';
import { createWorkspace, initWorkspace, loadWorkspace } from '../workspace';

export const command: string = 'start [services..]';
export const desc: string =
    'Start one or more services.\nBy default starts service found within current directory, but you can pass one or more service names instead.';

type Options = GlobalOptions & {
    services?: string[];
    force?: boolean;
    mode: Mode;
};

export const builder: CommandBuilder<Options, Options> = yargs =>
    yargsAddGlobalOptions(yargs).options({
        services: {
            array: true,
            type: 'string',
            demandOption: true,
        },
        force: {
            type: 'boolean',
        },
        mode: {
            choices: ['default', 'hook'] as const,
            default: 'default' as Mode,
        },
    });

export const handler = async (args: Arguments<Options>) => {
    const cwd = process.cwd().replace(/\\/g, '/');

    // TODO: store workspace name in ~/home/.uniform/settings.json
    const wsPath = cwd;

    const ws = createWorkspace(wsPath, cwd);
    await loadWorkspace(ws);
    await initWorkspace(ws);

    const options: GlobalOptions = {
        debug: args.debug,
        mode: args.mode,
        force: args.force,
        dryRun: args.dryRun,
    };

    for (const compName of args.services!) {
        const comp = ws.components.get(compName);

        if (!comp) throw new Error('service ' + compName + ' not found');

        await componentStart(comp!, options);
    }
};
