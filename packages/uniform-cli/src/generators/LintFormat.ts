import { GeneratorRequires } from '../decorators';
import { Context, IGenerator } from '../types';
import ScaffoldGenerator from './Scaffold';

export interface LintFormatGeneratorConfig {
    foo?: 'bar';
}

@GeneratorRequires([ScaffoldGenerator])
export default class LintFormatGenerator implements IGenerator {
    async generate(ctx: Context) {
        const config: LintFormatGeneratorConfig = {};
        console.log('LintFormat: Read config from yargs or from uniform.json or from .eslintrc.js or from .prettierrc.js');

        console.log('Created LintFormat, config=', config);

        return ctx;
    }
}
