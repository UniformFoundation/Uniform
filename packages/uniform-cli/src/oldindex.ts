import { existsSync } from 'fs';
import { gray, green, red } from 'kleur/colors';
import prompts from 'prompts';
import yargsParser from 'yargs-parser';

import { version } from '../package.json';
import { loadContext } from './context';
import { dependencies, getDependencyOrder } from './decorators';
import ApiGenerator from './generators/Api';
import GitHooksGenerator from './generators/GitHooks';
import KafkaGenerator from './generators/Kafka';
import LintFormatGenerator from './generators/LintFormat';
import PrismaGenerator from './generators/Prisma';
import ScaffoldGenerator from './generators/Scaffold';
import { ClassType, IGenerator } from './types';

export const generators = [
    PrismaGenerator,
    ApiGenerator,
    GitHooksGenerator,
    LintFormatGenerator,
    ScaffoldGenerator,
    KafkaGenerator,
];

const disclaimer = `
Welcome to the Uniform setup wizard!
There are definitely bugs and some features might not work yet.
If you encounter an issue, have a look at https://github.com/iamcsharper/Uniform/issues and open a new one, if it is not already tracked.
`;

async function main() {
    console.log(gray(`\ncreate-uniform-app version ${version}`));
    console.log(red(disclaimer));

    const context = await loadContext();
    console.log('Context=', context);

    const args = yargsParser(context.yargs);

    const targetFolder =
        args[0] ||
        (
            await prompts({
                type: 'text',
                name: 'value',
                message: 'Where do you want to create',
                initial: 'my-app',
            })
        ).value;

    const isExists = existsSync(targetFolder);

    
    if (isExists) {

    }

    const plugins = (
        await prompts({
            type: 'multiselect',
            name: 'plugins',
            message: 'Which plugins do you want to use?',
            choices: [...dependencies.keys()].map(generator => ({
                title: generator.replace('Generator', ''),
                value: generator,
            })),
            initial: 0,
        })
    ).plugins;

    if (!plugins.length) {
        throw new Error('No plugins selected');
    }

    context.plugins = plugins;
    context.targetFolder = targetFolder;

    const namedGenerators = new Map<string, ClassType<IGenerator>>();

    for (const generator of generators) {
        namedGenerators.set(generator.name, generator);
    }

    const ordered = getDependencyOrder();
    const orderedFiltered = ordered.filter(e => plugins.includes(e) || e === 'ScaffoldGenerator');

    for (const generatorName of orderedFiltered) {
        const Constructor = namedGenerators.get(generatorName)!;
        const instance = new Constructor();

        await instance.generate(context);
    }

    console.log(green('✅ Successfully generated'));
}

export default main;

main().catch(console.error);
