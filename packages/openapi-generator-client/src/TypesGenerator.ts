import toJsonSchema from '@openapi-contrib/openapi-schema-to-json-schema';
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import type { JSONSchema4 } from 'json-schema';
import { compile as compileTypescript } from 'json-schema-to-typescript';
import { MediaTypeObject, ParameterObject, RequestBodyObject, ResponseObject } from 'openapi-typescript';
import { Project } from 'ts-morph';
import { CodeBlockWriter } from 'ts-morph';

import { extractOperationTypeNames, hasPathParams, renderImports } from './helpers';
import { FlatOperation, ImportData, OverridePolicy } from './types';

export const SUPPORTED_REQUEST_CONTENT = ['multipart/form-data', 'application/json'] as const;
export type RequestContentType = typeof SUPPORTED_REQUEST_CONTENT[number];

const isEmptyObject = (val: any): val is null => {
    if (!val) return true;
    if (typeof val !== 'object') return false;

    return Object.keys(val).length === 0;
};

function convertToJsonSchema(schema: any) {
    const res = toJsonSchema(schema, {
        cloneSchema: false,
        strictMode: false,
        keepNotSupported: ['nullable'],
        beforeTransform: schema => {
            if (!('type' in schema)) return schema;

            if (schema.type === 'int') {
                schema.type = 'integer';
            }

            if (Array.isArray(schema.type)) {
                if (schema.type.includes('null'))
                    return {
                        type: schema.type.filter(e => e !== 'null')[0],
                        nullable: true,
                    };
                else throw new Error('Invalid type tuple: ' + JSON.stringify(schema));
            }

            return schema as any;
        },
    });
    delete res['$schema'];
    return res;
}

function extractResponseJsonSchema(schema: JSONSchema4) {
    if (schema.type !== 'object' || !schema.properties)
        throw new Error('Invalid json schema for response:' + JSON.stringify(schema));
    if (!('data' in schema.properties!) && !('meta' in schema.properties!))
        throw new Error('Invalid json schema for response:' + JSON.stringify(schema));

    let data = undefined;
    let meta = undefined;

    if ('data' in schema.properties!) {
        data = schema.properties.data;
    }

    if ('meta' in schema.properties!) {
        meta = schema.properties.meta;
    }

    return { data, meta };
}

export class TypesGenerator {
    private overridePolicy: OverridePolicy;

    constructor({ overridePolicy }: { overridePolicy: OverridePolicy }) {
        this.overridePolicy = overridePolicy;
    }

    private async generateRequestType(group: string, operation: FlatOperation, imports: ImportData[]) {
        const types = extractOperationTypeNames(operation);
        const isWithParam = hasPathParams(operation);

        if (!isEmptyObject((operation.requestBody as RequestBodyObject)?.content)) {
            const requestBody = operation.requestBody as RequestBodyObject;
            const content = requestBody.content as Record<RequestContentType, MediaTypeObject>;

            if (content['application/json'] && content['multipart/form-data'])
                throw new Error(
                    'Invalid operation has both json and multipart content in request body: ' +
                        JSON.stringify(operation)
                );

            if (content['application/json']?.schema && types.request) {
                const jsonSchema = convertToJsonSchema(content['application/json']?.schema);

                const ts = await compileTypescript(jsonSchema, types.request, {
                    bannerComment: '',
                    additionalProperties: false,
                });

                return ts;
            } else if (content['multipart/form-data']?.schema) {
                return `export type ${types.request} = {
                    formData: FormData;
                    ${isWithParam ? 'id: number | string;' : ''}
                }`;
            }

            // toJsonSchema(operation.)
        } else if (isWithParam && types.request) {
            return `export type ${types.request} = { id: number | string };`;
        }

        return '';
    }

    private async generateResponseType(group: string, operation: FlatOperation, imports: ImportData[]) {
        if (isEmptyObject(operation.responses))
            throw new Error('Invalid operation: ' + JSON.stringify(operation) + '. It has no responses.');

        const types = extractOperationTypeNames(operation);

        const responseDataSchema = {
            oneOf: [] as JSONSchema4[],
        };

        const responseMetaSchema = {
            oneOf: [] as JSONSchema4[],
        };

        (Object.values(operation.responses!) as ResponseObject[]).forEach(response => {
            if (response?.content?.['application/json']) {
                const jsonSchema = convertToJsonSchema(response?.content?.['application/json'].schema);

                try {
                    const { data, meta } = extractResponseJsonSchema(jsonSchema);
                    if (data) responseDataSchema.oneOf.push(data);
                    if (meta) responseMetaSchema.oneOf.push(meta);
                } catch (err) {
                    console.error('Invalid data at ', operation['x-path'], err);
                }
            }

            // TODO:
            // if (response?.content?.['application/octet-stream']) {
            //     const jsonSchema = convertToJsonSchema(response?.content?.['application/octet-stream']?.schema);

            //     oneOf.push(jsonSchema);
            // }
        });

        const dataCode = await compileTypescript(responseDataSchema, types.responseData!, {
            bannerComment: '',
            additionalProperties: false,
        });

        const metaCode = await compileTypescript(responseMetaSchema, types.responseMeta!, {
            bannerComment: '',
            additionalProperties: false,
        });

        return `
        ${dataCode}
        ${metaCode}
        export type ${types.response} = CommonResponse<${types.responseData}, ${types.responseMeta}>;
        `;
    }

    async generate(group: string, flatOperations: FlatOperation[]) {
        const folder = `output/${group}`;
        await mkdir(folder, { recursive: true });
        const filePath = `${folder}/types.ts`;

        const isExisting = existsSync(filePath);

        if (this.overridePolicy === 'skip' && isExisting) {
            console.warn('Skipping', group, 'according to policy.');
            return;
        }

        const project = new Project();
        const sourceFile = project.createSourceFile(`types.ts`, '', { overwrite: true });

        const imports: ImportData[] = [
            {
                from: '@api/common/types',
                name: 'CommonResponse',
            },
        ];

        const contentWriter = new CodeBlockWriter();

        await Promise.all(
            flatOperations.map(async operation => {
                const request = await this.generateRequestType(group, operation, imports);
                const response = await this.generateResponseType(group, operation, imports);

                contentWriter.write(request);
                contentWriter.blankLine();
                contentWriter.write(response);
            })
        );

        renderImports(sourceFile, imports);
        sourceFile.formatText();

        const content = sourceFile.getFullText() + '\n' + contentWriter.toString();

        await writeFile(filePath, content);
    }
}
