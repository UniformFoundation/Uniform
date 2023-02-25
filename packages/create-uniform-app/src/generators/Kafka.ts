import { GeneratorRequires } from '../decorators';
import { Context, IGenerator } from '../types';
import ScaffoldGenerator from './Scaffold';

export interface KafkaGeneratorConfig {
    foo?: 'bar';
}

@GeneratorRequires([ScaffoldGenerator])
export default class KafkaGenerator implements IGenerator {
    async generate(ctx: Context) {
        const config: KafkaGeneratorConfig = {};
        console.log('Kafka: Read config from yargs or from uniform.json');

        console.log('Created kafka, config=', config);

        return ctx;
    }
}
