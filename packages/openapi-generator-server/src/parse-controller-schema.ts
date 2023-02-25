import toJsonSchema from '@openapi-contrib/openapi-schema-to-json-schema';
import { JSONSchema } from 'json-schema-to-typescript';
import type { OpenAPIV3 } from 'openapi-types';

export interface RouteSchema {
    body?: JSONSchema;
    querystring: JSONSchema;
    params: JSONSchema;
    headers?: JSONSchema;
    response?:
        | JSONSchema
        | Record<
              string | number,
              {
                  description: string;
                  content: Record<string | number, any>;
              }
          >;
}

export interface RouteInfo {
    summary?: string;
    url: string;
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    schema: RouteSchema;
    group: string;
    operationId: string;
}

function convertSchema(route: OpenAPIV3.OperationObject) {
    const schema: RouteSchema = {
        querystring: {
            type: 'object',
        },
        params: {
            type: 'object',
        },
    };

    type schemaKey = 'querystring' | 'params';

    if (route.requestBody && 'content' in route.requestBody) {
        const jsonType = 'application/json';
        const fileType = 'multipart/form-data';

        if (jsonType in route.requestBody.content) {
            schema.body = route.requestBody.content[jsonType].schema;
        } else if (fileType in route.requestBody.content) {
            // TODO: file upload validation support
        }
    }

    if (route.parameters) {
        const params = route.parameters as OpenAPIV3.ParameterObject[];
        const mapping: Record<string, schemaKey> = {
            query: 'querystring',
            path: 'params',
        };

        params.forEach(param => {
            if (!(param.in in mapping))
                throw new Error(
                    `Unknown \`in\` ${param.in} of parameter ${JSON.stringify(param)} of route ${JSON.stringify(route)}`
                );

            const schemaField = schema[mapping[param.in]]!;
            if (!schemaField.properties) schemaField.properties = {};

            schemaField.properties![param.name] = toJsonSchema(param.schema!);
        });
    }

    if (route.responses) {
        const responseCodes = Object.keys(route.responses);

        if (responseCodes.length) {
            schema.response = route.responses;
        }
    }

    return schema;
}

function convertRouteInfo(group: string, groupPath: string, route: OpenAPIV3.PathItemObject): RouteInfo[] {
    const results: RouteInfo[] = [];

    (['get', 'put', 'post', 'patch', 'delete'] as const).forEach(m => {
        const method = m.toUpperCase() as RouteInfo['method'];
        if (m in route) {
            results.push({
                method,
                operationId: route[m]?.operationId!,
                schema: convertSchema(route[m] as OpenAPIV3.OperationObject),
                summary: route[m]?.summary,
                url: groupPath.replace(/{([a-zA-Z]+)}/g, ':$1'),
                group,
            });
        }
    });

    if (!results.length) throw new Error(`No methods found in route${JSON.stringify(route)}`);

    return results;
}

function extractGroupFromRoutePath(path: string) {
    if (!path) return null;
    const pathWithoutFirstSlash = path[0] === '/' ? path.slice(1) : path;

    const firstIndexOfSlash = pathWithoutFirstSlash.indexOf('/');

    const group = pathWithoutFirstSlash.slice(0, firstIndexOfSlash);
    const groupPath = pathWithoutFirstSlash.slice(firstIndexOfSlash);

    return { group, groupPath };
}

export interface ControllerSchema {
    version: string;
    routeGroups: Map<string, RouteInfo[]>;
}

export async function pathsToControllersRoutes(schema: OpenAPIV3.Document): Promise<ControllerSchema> {
    const routeGroups = new Map<string, RouteInfo[]>();

    const pathNames = Object.keys(schema.paths);
    if (pathNames.length === 0) throw new Error('No paths found.');

    await Promise.all(
        pathNames.map(async pathName => {
            const group = extractGroupFromRoutePath(pathName);

            if (!group) throw new Error(`Cant extract group from route path ${pathName}`);

            if (!routeGroups.has(group.group)) {
                routeGroups.set(group.group, []);
            }

            const groupRoutes = convertRouteInfo(group.group, group.groupPath, schema.paths[pathName] as any);
            routeGroups.get(group.group)!.push(...groupRoutes);
        })
    );

    return { version: schema.info.version, routeGroups };
}
