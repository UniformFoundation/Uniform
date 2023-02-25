import { GeneratorRequires } from '../decorators';
import { Context, IGenerator } from '../types';
import LintFormatGenerator from './LintFormat';
import ScaffoldGenerator from './Scaffold';

export interface GitHooksGeneratorConfig {
    foo?: 'bar';
}

@GeneratorRequires([ScaffoldGenerator, LintFormatGenerator])
export default class GitHooksGenerator implements IGenerator {
    async generate(ctx: Context) {
        const config: GitHooksGeneratorConfig = {};

        console.log('Created .git_hooks and .huskyrc.json, config=', config);
        // TODO: create .git_hooks and enable it.

        return ctx;
    }
}
