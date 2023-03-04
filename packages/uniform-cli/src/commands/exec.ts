import type { Arguments, CommandBuilder } from 'yargs';

import { componentExecOptions } from '../component';
import { GlobalOptions, Mode, yargsAddGlobalOptions } from '../core';
import { createWorkspace, initWorkspace, loadWorkspace } from '../workspace';

export const command: string = 'exec <service> [command..]';
export const desc: string = 'Execute [command..] in <service> container';

type Options = GlobalOptions & {
    command: string[];
    service: string;
    force?: boolean;
    mode: Mode;
};

export const builder: CommandBuilder<Options, Options> = yargs =>
    yargsAddGlobalOptions(yargs).options({
        command: {
            array: true,
            type: 'string',
            demandOption: true,
        },
        service: {
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
        cmd: args.command,
    };

    const comp = ws.components.get(args.service);

    if (!comp) throw new Error('service ' + args.service + ' not found');

    await componentExecOptions(comp!, options);
};
