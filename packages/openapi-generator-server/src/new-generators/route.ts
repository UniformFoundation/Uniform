import { RouteInfo } from '../parse-controller-schema';
import { GeneratorOptions } from '../utils';
import { ImportsGenerator } from './imports';
import { getRouteSchemaObjectName, getRouteSchemaTypeName } from './schemas';

export type RouteCode = {
    inFunctionBody: string;
    imports: string;
};

export async function generateRoutes(options: GeneratorOptions, schema: Map<string, RouteInfo[]>) {
    const groupCodes = new Map<string, RouteCode>();

    const groupNames = [...schema.keys()];
    await Promise.all(
        groupNames.map(async groupName => {
            const groupRoutes = schema.get(groupName)!;

            let inFunctionBody = '';
            const imports = new ImportsGenerator();

            groupRoutes.map(async route => {
                const prefix = options.schemeInterfaces.groupPrefix ? route.group : '';

                const schemaObjectName = getRouteSchemaObjectName(prefix, route);
                const schemaTypeName = getRouteSchemaTypeName(prefix, route);

                imports.addImport('./schemas', schemaObjectName);
                imports.addImport('./schemas', schemaTypeName);

                inFunctionBody += `
                    fastify.${route.method.toLowerCase()}<${schemaTypeName}>('${route.url}', {
                        handler: async (req, res) => {
                            // TODO: user code goes here
                            throw new Error('Not implemented');
                        },
                        schema: ${schemaObjectName},
                    })
                `;
            });

            groupCodes.set(groupName, {
                imports: imports.generate(),
                inFunctionBody
            });
        })
    );

    return groupCodes;
}
