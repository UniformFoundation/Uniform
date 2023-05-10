import { FileLoader } from './FileLoader';
import { ReactQueryHookGenerator } from './ReactQueryHookGenerator';
import { SchemaParser } from './SchemaParser';
import { TypesGenerator } from './TypesGenerator';
import { flattenPaths, groupOperations } from './helpers';
import { ISchemaLoader } from './types';

async function main() {
    const loader: ISchemaLoader = new FileLoader('document.yaml');

    const rawDocument = await loader.load();
    const parser = new SchemaParser(rawDocument, loader);

    const document = await parser.parse();

    const paths = document.paths;
    const groupedOperations = groupOperations(flattenPaths(paths));

    const groups = Object.keys(groupedOperations);

    const hookGen = new ReactQueryHookGenerator({
        overridePolicy: 'override',
    });
    const typeGen = new TypesGenerator({
        overridePolicy: 'override',
    });

    await Promise.all([
        ...groups.map(group => {
            hookGen.generate(group, groupedOperations[group]);
        }),
        ...groups.map(group => {
            typeGen.generate(group, groupedOperations[group]);
        }),
    ]);
}

main().catch(console.error);
