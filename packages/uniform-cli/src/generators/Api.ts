import { GeneratorRequires } from '../decorators';
import { Context, IGenerator } from '../types';
import ScaffoldGenerator from './Scaffold';

export interface ApiGeneratorConfig {
    foo?: 'bar';
}

@GeneratorRequires([ScaffoldGenerator])
export default class ApiGenerator implements IGenerator {
    async generate(ctx: Context) {
        console.log('Api: Read config from yargs or from uniform.json');
        const config: ApiGeneratorConfig = {};

        console.log('Created .git_hooks and .huskyrc.json. config=', config);
        // TODO: create .git_hooks and enable it.

        return ctx
    }
}
