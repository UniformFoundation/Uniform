import { GeneratorRequires } from '../decorators';
import { Context, IGenerator } from '../types';
import ScaffoldGenerator from './Scaffold';

export interface PrismaGeneratorConfig {
    foo?: 'bar';
}

@GeneratorRequires([ScaffoldGenerator])
export default class PrismaGenerator implements IGenerator {
    async generate(ctx: Context) {
        const config: PrismaGeneratorConfig = {};
        console.log('Prisma: Read config from yargs or from uniform.json or from schema.prisma');

        console.log('Created Prisma, config=', config);

        return ctx;
    }
}
