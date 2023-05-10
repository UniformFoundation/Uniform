import { camel, kebab } from 'case';
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { ParameterDeclarationStructure, Project, VariableDeclarationKind } from 'ts-morph';

import {
    SEARCH_OPCODES,
    extractOperationTypeNames,
    hasFileUpload,
    hasPathParams,
    parseOpcode,
    removeLeadingSlash,
    renderImports,
} from './helpers';
import { FlatOperation, ImportData, OverridePolicy } from './types';

const replacePlaceholders = (str: string) => str.replace(/\{([^}]+)\}/g, `\${$1}`);

const extractQueryKey = (group: string, operation: FlatOperation) => {
    const path_snake = removeLeadingSlash(operation['x-path']).replaceAll('/', '_');
    let queryKey = kebab(path_snake).replace(`${group}-`, '');
    queryKey = `${group}-${operation['x-method']}-${queryKey}`;

    return queryKey;
};

const extractInvalidationOperations = (op: FlatOperation, allOperations: FlatOperation[]) => {
    // /cms/product-groups/
    const path = op['x-path'];

    if (!path.includes('{id}')) return [];

    const subpath = path.split('/{id}')[0];

    return allOperations.filter(e => {
        if (!SEARCH_OPCODES.includes(parseOpcode(e))) return false;

        if (e['x-path'] === subpath) return true;
        if (e['x-path'] === `${subpath}/{id}`) return true;
        if (e['x-path'] === `${subpath}:search`) return true;
        if (e['x-path'] === `${subpath}:search-one`) return true;

        return false;
    });
};

export const createCallQueryKey = (operation: FlatOperation, forInvalidation = false) => {
    const isHavePathParams = hasPathParams(operation);
    const id = forInvalidation ? 'data?.id' : 'id';

    // Always invalidate search of multiple entities.
    if (forInvalidation && operation['x-path'].endsWith(':search')) return `QueryKeys.${operation.operationId}()`;

    if (operation.requestBody && isHavePathParams) {
        return `QueryKeys.${operation.operationId}(${id}, data)`;
    } else if (isHavePathParams) {
        return `QueryKeys.${operation.operationId}(${id})`;
    } else if (operation.requestBody) {
        return `QueryKeys.${operation.operationId}(data)`;
    } else {
        return `QueryKeys.${operation.operationId}()`;
    }
};

export class ReactQueryHookGenerator {
    private overridePolicy: OverridePolicy;

    constructor({ overridePolicy }: { overridePolicy: OverridePolicy }) {
        this.overridePolicy = overridePolicy;
    }

    async generate(group: string, flatOperations: FlatOperation[]) {
        const folder = `output/${group}`;
        await mkdir(folder, { recursive: true });
        const filePath = `${folder}/index.ts`;

        const isExisting = existsSync(filePath);

        if (this.overridePolicy === 'skip' && isExisting) {
            console.warn('Skipping', group, 'according to policy.');
            return;
        }

        const project = new Project();
        const sourceFile = project.createSourceFile(`index.ts`, '', { overwrite: true });

        const imports: ImportData[] = [];
        imports.push(
            ...[
                {
                    from: 'react-query',
                    name: 'useMutation',
                },
                {
                    from: 'react-query',
                    name: 'useQuery',
                },
                {
                    from: '@api/common/types',
                    name: 'FetchError',
                },

                {
                    from: '@api/',
                    name: 'apiClient',
                },
            ]
        );

        const searchOperations = flatOperations.filter(e => SEARCH_OPCODES.includes(parseOpcode(e)));

        type OperationId = string;
        const queryKeys = searchOperations.reduce((acc, searchOperation) => {
            const pathParameters =
                searchOperation.parameters?.filter(e => {
                    if ('in' in e) {
                        return e.in === 'path';
                    }

                    return false;
                }) || [];

            if (pathParameters.length && searchOperation.requestBody) {
                throw new Error(
                    `Unsupported route definition: path parameters + requestBody. 
                    Please move your path parameters (${JSON.stringify(pathParameters)}) into request body`
                );
            }

            if (pathParameters.length > 1) {
                throw new Error('Unsupported multiple path parameters.');
            }

            acc[searchOperation.operationId!] = {
                ...searchOperation,
                hasPathParams: pathParameters.length > 0,
                hasBody: !!searchOperation.requestBody,
            };

            return acc;
        }, {} as Record<OperationId, FlatOperation & { hasPathParams: boolean; hasBody: boolean }>);

        // console.log(group, queryKeys);

        sourceFile.addVariableStatement({
            isExported: true,
            declarationKind: VariableDeclarationKind.Const,
            declarations: [
                {
                    name: 'QueryKeys',
                    initializer: writer => {
                        const entries = Object.entries(queryKeys);
                        writer.writeLine('{');

                        entries.forEach(([key, op]) => {
                            const queryKey = extractQueryKey(group, op);
                            if (op.hasBody && op.hasPathParams) {
                                writer.writeLine(
                                    `${key}: (id?: number | string, data?: any) => (id || data) ? ['${queryKey}', id, data] : ['${queryKey}'],`
                                );
                            } else if (op.hasPathParams) {
                                writer.writeLine(
                                    `${key}: (id?: number | string) => id ? ['${queryKey}', id] : ['${queryKey}'],`
                                );
                            } else if (op.hasBody) {
                                writer.writeLine(
                                    `${key}: (data?: any) => data ? ['${queryKey}', data] : ['${queryKey}'],`
                                );
                            } else {
                                writer.writeLine(`${key}: () => ['${queryKey}'],`);
                            }
                        });

                        writer.writeLine('}');
                    },
                },
            ],
        });

        const extractName = (operation: FlatOperation, method: string = '') => {
            const path_snake = removeLeadingSlash(operation['x-path']).replaceAll('/', '_');
            return camel(`use_${method}_${path_snake}`);
        };

        flatOperations.forEach(operation => {
            const initialName = extractName(operation);

            const queryParams =
                operation.parameters?.filter(e => {
                    if (!('in' in e)) return false;
                    return e.in === 'query';
                }) || [];

            if (queryParams.length && operation.isMutation)
                throw new Error('Mutations with queryParams are not supported yet: check ' + JSON.stringify(operation));

            const methodIfNeeded =
                flatOperations.filter(anotherOp => {
                    if (extractName(anotherOp) === initialName) return true;
                }).length > 1
                    ? operation['x-method']
                    : '';

            const name = methodIfNeeded ? extractName(operation, methodIfNeeded) : initialName;

            const callApi = (withData = false) => {
                const method = operation['x-method'].toLowerCase();
                const path = replacePlaceholders(operation['x-path']);

                let args: string[] = [];

                if (withData) {
                    if (hasFileUpload(operation)) {
                        args.push('data: data.formData');
                    } else {
                        args.push('data');
                    }
                }
                if (queryParams.length) args.push('params');

                return `apiClient.${method}(\`${path}\`, {${args.join(', ')}})`;
            };

            const types = extractOperationTypeNames(operation);

            if (types.request) {
                imports.push({
                    from: './types',
                    name: types.request,
                });
            }

            imports.push({
                from: './types',
                name: types.response,
            });

            if (operation.isMutation) {
                const dataParamInfo = {
                    type: null as string | null,
                    definition: '',
                    hasRequestBody: !!operation.requestBody,
                };

                if (hasPathParams(operation) && operation.requestBody) {
                    dataParamInfo.type = `{ id: number | string; } & ${types.request}`;
                    dataParamInfo.definition = '({ id, ...data })';
                } else if (hasPathParams(operation)) {
                    dataParamInfo.type = types.request;
                    dataParamInfo.definition = '({ id, })';
                } else if (operation.requestBody) {
                    dataParamInfo.type = types.request;
                    dataParamInfo.definition = '(data)';
                }

                sourceFile.addFunction({
                    name: name,
                    isExported: true,
                    isDefaultExport: false,
                    docs: operation.description ? [operation.description] : [],
                    statements: writer => {
                        const opsToInvalidate = searchOperations
                            ? extractInvalidationOperations(operation, flatOperations)
                            : [];

                        if (opsToInvalidate.length) {
                            writer.writeLine(`const queryClient = useQueryClient();`);

                            imports.push({
                                from: 'react-query',
                                name: 'useQueryClient',
                            });

                            writer.blankLine();
                        }

                        writer.writeLine(`return useMutation<${types.response}, FetchError, ${dataParamInfo.type}>(`);

                        writer.writeLine(`${dataParamInfo.definition} => ${callApi(dataParamInfo.hasRequestBody)},`);

                        if (opsToInvalidate.length) {
                            writer.writeLine('{');
                            writer.writeLine('onSuccess: ({ data }) => {');
                            opsToInvalidate.forEach(op => {
                                writer.write('queryClient.invalidateQueries(');
                                writer.write(createCallQueryKey(op, true));
                                writer.write(');');
                                writer.blankLine();
                            });
                            writer.writeLine('},');
                            writer.writeLine('}');
                        }

                        writer.writeLine(');');
                    },
                });
            } else {
                const dataParamInfo = {
                    type: null as string | null,
                    name: 'data',
                };

                if (hasPathParams(operation) && operation.requestBody) {
                    dataParamInfo.type = `{ id: number | string; } & ${types.request}`;
                    dataParamInfo.name = '{ id, ...data }';
                } else if (hasPathParams(operation)) {
                    dataParamInfo.type = '{ id: number | string; }';
                    dataParamInfo.name = '{ id, }';
                } else if (operation.requestBody) {
                    dataParamInfo.type = types.request;
                    dataParamInfo.name = 'data';
                }

                sourceFile.addFunction({
                    name: name,
                    docs: operation.description ? [operation.description] : [],
                    isExported: true,
                    isDefaultExport: false,
                    parameters: [
                        ...(dataParamInfo.type
                            ? ([
                                  {
                                      name: dataParamInfo.name,
                                      type: dataParamInfo.type,
                                  },
                              ] as ParameterDeclarationStructure[])
                            : []),
                        ...(queryParams.length
                            ? ([
                                  {
                                      name: 'params',
                                      type: 'Record<string, any>',
                                      initializer: '{}',
                                  },
                              ] as ParameterDeclarationStructure[])
                            : []),
                        {
                            name: 'enabled',
                            initializer: 'true',
                        },
                    ],
                    statements: writer => {
                        writer.writeLine(`return useQuery<${types.response}, FetchError>({`);
                        writer.indent(2);

                        if (operation.operationId! in queryKeys) {
                            const call = createCallQueryKey(operation);

                            if (call) {
                                writer.write(`queryKey: ${call},`);
                            }
                        }

                        writer.indent(2);
                        writer.writeLine(`queryFn: () => ${callApi(!!operation.requestBody)},`);
                        writer.writeLine('enabled,');
                        writer.writeLine('});');
                    },
                });
            }
        });

        renderImports(sourceFile, imports);

        sourceFile.formatText();

        const content = sourceFile.getFullText();

        await writeFile(filePath, content);
    }
}
