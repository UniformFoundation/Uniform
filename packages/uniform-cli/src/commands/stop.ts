import type { Arguments, CommandBuilder } from 'yargs';

import { componentStop } from '../component';
import { GlobalOptions, yargsAddGlobalOptions } from '../core';
import { createWorkspace, initWorkspace, loadWorkspace } from '../workspace';

export const command: string = 'stop [services..]';
export const desc: string =
    'Stop one or more services.';

type Options = GlobalOptions & {
    services?: string[];
    force?: boolean;
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
        force: args.force,
        dryRun: args.dryRun,
    };

    for (const compName of args.services!) {
        const comp = ws.components.get(compName);

        if (!comp) throw new Error('service ' + compName + ' not found');

        await componentStop(comp!, options);
    }
};
