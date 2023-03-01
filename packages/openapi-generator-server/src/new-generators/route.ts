import { RouteInfo } from '../parse-controller-schema';
import { GeneratorOptions } from '../utils';
import { ImportsGenerator } from './imports';
import { getRouteSchemaObjectName, getRouteSchemaTypeName } from './schemas';

export type RouteCode = {
    inClassBody: string;
    imports: ImportsGenerator;
};

export async function generateRoutes(options: GeneratorOptions, schema: Map<string, RouteInfo[]>) {
    const groupCodes = new Map<string, RouteCode>();

    const groupNames = [...schema.keys()];
    await Promise.all(
        groupNames.map(async groupName => {
            const groupRoutes = schema.get(groupName)!;

            let inClassBody = '';
            const imports = new ImportsGenerator();

            groupRoutes.map(async route => {
                const prefix = options.schemeInterfaces.groupPrefix ? route.group : '';

                const schemaObjectName = getRouteSchemaObjectName(prefix, route);
                const schemaTypeName = getRouteSchemaTypeName(prefix, route);

                imports.addImport('fastify', 'FastifyRequest');
                imports.addImport('fastify', 'FastifyReply');
                
                imports.addImport('fastify-decorators', route.method.toUpperCase());

                imports.addImport('./schemas', schemaObjectName);
                imports.addImport('./schemas', schemaTypeName);


                inClassBody += `
                    @${route.method.toUpperCase()}({
                        url: '${route.url}',
                        options: {
                            schema: ${schemaObjectName},
                        }
                    })
                    async ${route.operationId}Handler(req: FastifyRequest<${schemaTypeName}>, res: FastifyReply) {
                        // TODO: user code goes here
                        throw new Error('Not implemented');
                    }
                `;
            });

            groupCodes.set(groupName, {
                imports,
                inClassBody: inClassBody,
            });
        })
    );

    return groupCodes;
}
