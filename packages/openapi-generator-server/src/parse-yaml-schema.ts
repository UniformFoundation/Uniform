import RefParser from '@apidevtools/json-schema-ref-parser';
import { FileInfo } from '@apidevtools/json-schema-ref-parser/dist/lib/types';
import { readFile } from 'fs/promises';
import jsYaml from 'js-yaml';
import type { OpenAPIV3 } from 'openapi-types';
import path from 'path';

import { resolvePath } from './utils';

export async function parseSchema(pathToIndex: string) {
    const indexSchemaContent = await readFile(pathToIndex, 'utf-8');
    const indexSchema = jsYaml.loadAll(indexSchemaContent);

    const fullSchemaArr = (await RefParser.dereference(indexSchema, {
        continueOnError: false,
        parse: {
            json: false,
            yaml: {
                allowEmpty: false,
            },
        },
        resolve: {
            file: {
                read: async (file: FileInfo, cb: any) => {
                    if (file.url.includes('json-schema-ref-parser/dist/')) {
                        const realPath = resolvePath(
                            file.url.split('json-schema-ref-parser/dist/')[1],
                            path.dirname(pathToIndex)
                        );
                        const res = await readFile(realPath, 'utf-8');
                        cb(undefined, res);
                        return res;
                    }
                    const res = readFile(file.url, 'utf-8');
                    cb(undefined, res);
                    return res;
                },
            },
        },
        dereference: {
            // circular: true,
        },
    })) as readonly [obj: OpenAPIV3.Document];

    return fullSchemaArr[0];
}
