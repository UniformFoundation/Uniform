export interface Context {
    yargs: string[];

    packageManager: 'yarn' | 'pnpm' | 'npm';

    targetFolder?: string;
    plugins?: string;
}

export interface IGenerator {
    generate: (context: Context) => Promise<Context>;
}

export interface ClassType<T> extends Function {
    new (...args: any[]): T;
}