import RefParser from '@apidevtools/json-schema-ref-parser';
import type { OpenAPIV3 } from 'openapi-types';

import { ISchemaLoader } from './types';

export class SchemaParser {
    private schemaObject!: object;
    private schemaLoader: ISchemaLoader;

    constructor(schemaObject: object, schemaLoader: ISchemaLoader) {
        this.schemaObject = schemaObject;
        this.schemaLoader = schemaLoader;
    }

    async parse() {
        const fullSchemaArr = (await RefParser.dereference(this.schemaObject, {
            continueOnError: false,
            parse: {
                json: false,
                yaml: {
                    allowEmpty: false,
                },
            },
            resolve: {
                file: {
                    read: this.schemaLoader.readPortion,
                },
            },
            dereference: {
                // circular: true,
            },
        })) as OpenAPIV3.Document;

        return fullSchemaArr;
    }
}
