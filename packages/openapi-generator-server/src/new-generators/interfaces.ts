import { compile as compileTypescript } from 'json-schema-to-typescript';

import { RouteInfo } from '../parse-controller-schema';
import { GeneratorOptions, extractNameFromPath } from '../utils';

export const getRouteInterfaceNames = (prefix: string, route: RouteInfo) => {
    const name = extractNameFromPath(prefix + route.operationId);

    return {
        body: `${name}Body`,
        params: `${name}Params`,
        query: `${name}Query`,
        response: `${name}Response`,
    };
};

export interface RouteTypes {
    body?: string;
    params?: string;
    query?: string;
    response?: string;

    names: ReturnType<typeof getRouteInterfaceNames>;
}

export async function generateInterface(options: GeneratorOptions, schema: Map<string, RouteInfo[]>) {
    const interfaces = new Map<string, RouteTypes[]>();

    const groupNames = [...schema.keys()];
    await Promise.all(
        groupNames.map(async groupName => {
            const groupRoutes = schema.get(groupName)!;
            interfaces.set(groupName, []);

            await Promise.all(
                groupRoutes.map(async route => {
                    const prefix = options.schemeInterfaces.groupPrefix ? route.group : '';
                    const names = getRouteInterfaceNames(prefix, route);

                    const routeTypes: RouteTypes = {
                        names,
                    };

                    if (route.schema.body) {
                        const ts = await compileTypescript(route.schema.body!, names.body, {
                            bannerComment: '',
                            additionalProperties: false,
                        });

                        routeTypes.body = ts;
                    }

                    if (Object.keys(route.schema.params).length > 0) {
                        const ts = await compileTypescript(route.schema.params, names.params, {
                            bannerComment: '',
                            additionalProperties: false,
                        });
                        routeTypes.params = ts;
                    }

                    if (Object.keys(route.schema.querystring).length > 0) {
                        const ts = await compileTypescript(route.schema.querystring, names.query, {
                            bannerComment: '',
                            additionalProperties: false,
                        });
                        routeTypes.query = ts;
                    }

                    if (route.schema.response) {
                        const responseSchema = {
                            oneOf: Object.values(route.schema.response)
                                .map((e: { description: string; content: Record<string, any> }) => {
                                    if (e?.content?.['application/json'])
                                        return e?.content?.['application/json'].schema;
                                    if (e?.content?.['application/octet-stream'])
                                        return e?.content?.['application/octet-stream']?.schema;

                                    return undefined;
                                })
                                .filter(Boolean),
                        };

                        const ts = await compileTypescript(responseSchema, names.response, {
                            bannerComment: '',
                            additionalProperties: false,
                        });
                        routeTypes.response = ts;
                    }

                    interfaces.get(groupName)!.push(routeTypes);
                })
            );
        })
    );

    return interfaces;
}
