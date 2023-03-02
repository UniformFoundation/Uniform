import { RouteInfo } from '../parse-controller-schema';
import { GeneratorOptions, HTTPMethod } from '../utils';
import { ImportsGenerator } from './imports';
import { getRouteSchemaObjectName, getRouteSchemaTypeName } from './schemas';

interface MethodInfo {
    reqSchemaName: string;
    resTypeName: string;
    decorators: {
        [key in HTTPMethod]?: {
            url: string;
            schemaName: string;
            options: Record<string, string>;
        };
    };
}

export type ControllerCode = {
    inClassBody: string;
    imports: ImportsGenerator;
    methods: Record<string, MethodInfo>;
};

export async function generateControllers(options: GeneratorOptions, schema: Map<string, RouteInfo[]>) {
    const groupCodes = new Map<string, ControllerCode>();

    const groupNames = [...schema.keys()];
    await Promise.all(
        groupNames.map(async groupName => {
            const groupRoutes = schema.get(groupName)!;

            let inClassBody = '';
            const imports = new ImportsGenerator();
            const methods = new Map<string, MethodInfo>();

            groupRoutes.map(async route => {
                const prefix = options.schemeInterfaces.groupPrefix ? route.group : '';

                const schemaObjectName = getRouteSchemaObjectName(prefix, route);
                const schemaTypeName = getRouteSchemaTypeName(prefix, route);

                imports.addImport('fastify', 'FastifyRequest');
                imports.addImport('fastify', 'FastifyReply');

                imports.addImport('fastify-decorators', route.method.toUpperCase());

                imports.addImport('./schemas', schemaObjectName);
                imports.addImport('./schemas', schemaTypeName);

                const methodName = `${route.operationId}Handler`;

                inClassBody += `
                    @${route.method.toUpperCase()}({
                        url: '${route.url}',
                        options: {
                            schema: ${schemaObjectName},
                        }
                    })
                    async ${methodName}(req: FastifyRequest<${schemaTypeName}>, res: FastifyReply) {
                        // TODO: user code goes here
                        throw new Error('Not implemented');
                    }
                `;

                methods.set(methodName, {
                    reqSchemaName: schemaTypeName,
                    resTypeName: 'FastifyReply',
                    decorators: {
                        [route.method.toUpperCase() as HTTPMethod]: {
                            url: route.url,
                            schemaName: schemaObjectName,
                            options: {},
                        },
                    },
                });
            });

            groupCodes.set(groupName, {
                imports,
                methods: Object.fromEntries(methods.entries()),
                inClassBody: inClassBody,
            });
        })
    );

    return groupCodes;
}
