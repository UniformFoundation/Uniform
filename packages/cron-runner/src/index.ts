import { parseExpression } from 'cron-parser';
import { isAbsolute, join, resolve } from 'path';
import glob from 'tiny-glob';

type Neverize<T> = {
    [key in keyof T]?: never;
};

type OneOf<A, B> = (A & Neverize<B>) | (B & Neverize<A>);

export interface PeriodicTaskParams {
    cron: string;
}

export interface OneOffTaskParams {
    runsAt: Date;
    _executed?: boolean;
}

export type Task = OneOf<PeriodicTaskParams, OneOffTaskParams> & {
    name?: string;
    path?: string;
    execute(): Promise<void>;
};

export interface GlobOptions {
    folder: string;
    pattern: string;
}

export interface ArrayOptions {
    tasks: Task[];
}

interface EventListeners {
    onTaskComplete?: (task: Task) => void | Promise<void>;
}

async function loadTasks(folder: string, pattern: string): Promise<Task[]> {
    if (!isAbsolute(folder)) throw new Error('folder must be an absolute path');

    const files = await glob(pattern, { cwd: folder });

    const tasks: Task[] = [];

    await Promise.all(
        files.map(async file => {
            const module = require(join(folder, file).replace(/\\/g, '/'));

            const isValid = 'default' in module && typeof module.default === 'object';

            if (!isValid) {
                console.error('Error loading task file:', file, 'it must contain single default export:');
                console.error('     ```````````````````````````````````````````````````````````');
                console.error("     ` const task = taskBuilder.daily().at('11:30').build(); `");
                console.error('     ` export default task                                     `');
                console.error('     ```````````````````````````````````````````````````````````');
                return;
            }

            tasks.push({ ...module.default, path: file });
        })
    );

    console.info('Loaded', tasks.length, 'tasks from folder', folder);

    // TODO: use tiny-glob
    return tasks;
}

export type CronRunnerOptions<A extends GlobOptions | ArrayOptions> = {
    tickTime?: number;
} & EventListeners &
    (A extends GlobOptions ? GlobOptions & Neverize<ArrayOptions> : ArrayOptions & Neverize<GlobOptions>);

function shouldRunTask(task: Task, tickTime: number) {
    if (task.runsAt) {
        // [tick1] ... [tick2] <->. [runsAt] ....
        if (task._executed) return;

        if (Date.now() > task.runsAt.getTime() - tickTime) {
            return true;
        }
    } else {
        const cron = parseExpression(task.cron);
        const nextSuitable = cron.next();

        if (Date.now() > nextSuitable.toDate().getTime() - tickTime) {
            return true;
        }
    }
    return false;
}

function taskToString(task: Task): string {
    if (task.name) return `${task.name} (${task.cron || task.runsAt?.toLocaleString()})`;

    if (task.path) return `${task.path} (${task.cron || task.runsAt?.toLocaleString()})`;

    return `Unknown task (${task.cron || task.runsAt?.toLocaleString()})`;
}

export async function createTaskRunner<A extends GlobOptions | ArrayOptions>(options: CronRunnerOptions<A>) {
    const tasks = options.tasks || (await loadTasks(options.folder, options.pattern));
    const tickTime = options.tickTime || 1000;

    const tick = () => {
        tasks.forEach(task => {
            if (!shouldRunTask(task, tickTime)) return;

            if (task.runsAt) {
                task._executed = true;
            }

            try {
                task.execute()
                    .then(() => {
                        options.onTaskComplete?.(task);
                    })
                    .catch(err => {
                        console.error('\x1b[31m[Error] at task', taskToString(task), '\x1b[0m');
                        console.error(err);
                    });
            } catch (err) {
                console.error('Error running task', taskToString(task), err);
            }
        });
    };

    const tid = setInterval(tick, tickTime);
    const stop = () => clearInterval(tid);

    return { tid, stop };
}
