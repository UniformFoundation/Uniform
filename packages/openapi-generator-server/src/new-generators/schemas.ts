import { RouteInfo } from '../parse-controller-schema';
import { GeneratorOptions, ucFirst } from '../utils';
import { ImportsGenerator } from './imports';
import { getRouteInterfaceNames } from './interfaces';

interface RouteSchema {
    schemaTypeName: string;
    schemaTypeContent: string;

    schemaObjectName: string;
    schemaObjectContent: string;
}

type SchemasGeneratorData = {
    imports: string;
    routes: RouteSchema[];
};

export const getRouteSchemaTypeName = (prefix: string, route: RouteInfo) =>
    `${ucFirst(prefix) + ucFirst(route.operationId)}SchemaType`;
export const getRouteSchemaObjectName = (prefix: string, route: RouteInfo) =>
    `${prefix}${ucFirst(route.operationId)}Schema`;

export async function generateSchemas(options: GeneratorOptions, schema: Map<string, RouteInfo[]>) {
    const groupSchemas = new Map<string, SchemasGeneratorData>();

    const groupNames = [...schema.keys()];
    await Promise.all(
        groupNames.map(async groupName => {
            const groupRoutes = schema.get(groupName)!;
            groupSchemas.set(groupName, {
                imports: '',
                routes: [],
            });

            const imports = new ImportsGenerator();

            await Promise.all(
                groupRoutes.map(async route => {
                    const prefix = options.schemeInterfaces.groupPrefix ? route.group : '';
                    const names = getRouteInterfaceNames(prefix, route);

                    const bodyInterface = route.schema.body ? names.body : undefined;
                    const paramsInterface = Object.keys(route.schema.params).length > 0 ? names.params : undefined;
                    const queryInterface = Object.keys(route.schema.querystring).length > 0 ? names.query : undefined;
                    const responseInterface = route.schema.response ? names.response : undefined;

                    const schemaTypeName = getRouteSchemaTypeName(prefix, route);
                    const schemaObjectName = getRouteSchemaObjectName(prefix, route);

                    const schemaObjectContent = JSON.stringify({...route.schema, response: undefined });

                    const schemaTypeContent = `{
                        ${bodyInterface ? `Body: ${bodyInterface};` : ''}
                        ${paramsInterface ? `Params: ${paramsInterface};` : ''}
                        ${queryInterface ? `Querystring: ${queryInterface};` : ''}
                        ${responseInterface ? `Reply: ${responseInterface};` : ''}
                    }`;

                    [bodyInterface, paramsInterface, queryInterface, responseInterface]
                        .filter(Boolean)
                        .forEach(interfaceName => imports.addImport('./types', interfaceName!));

                    groupSchemas.get(groupName)!.routes.push({
                        schemaObjectContent,
                        schemaObjectName,
                        schemaTypeName,
                        schemaTypeContent,
                    });
                })
            );

            groupSchemas.get(groupName)!.imports = imports.generate();
        })
    );

    return groupSchemas;
}
