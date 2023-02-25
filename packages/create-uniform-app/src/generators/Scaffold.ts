import prompts from 'prompts';
import yargsParser from 'yargs-parser';

import { Context, IGenerator } from '../types';

const gitIgnore = `
dist
.solid
.output
.vercel
.netlify
netlify
# dependencies
/node_modules
# IDEs and editors
/.idea
.project
.classpath
*.launch
.settings/
# Temp
gitignore
# System Files
.DS_Store
Thumbs.db
`;

export default class ScaffoldGenerator implements IGenerator {
    async generate(ctx: Context): Promise<Context> {
        const exampleValue =  (
            await prompts({
                type: 'text',
                name: 'value',
                message: 'Some question from scaffold',
                initial: 'lol',
            })
        ).value;

        console.log('[Scaffold] exampleValue=', exampleValue);        

        return {
            ...ctx,
        };
    }
}
