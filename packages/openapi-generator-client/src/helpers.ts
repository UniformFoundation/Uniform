import { kebab, pascal } from 'case';
import type { OpenAPIV3 } from 'openapi-types';
import { PathItemObject, RequestBodyObject } from 'openapi-typescript';
import { SourceFile } from 'ts-morph';

import { RequestContentType } from './TypesGenerator';
import { FlatOperation, ImportData } from './types';

enum HttpMethod {
    GET = 'get',
    PUT = 'put',
    POST = 'post',
    DELETE = 'delete',
    OPTIONS = 'options',
    HEAD = 'head',
    PATCH = 'patch',
    TRACE = 'trace',
}

export const SEARCH_OPCODES = ['search', 'get'];

export const parseOpcode = (operation: OpenAPIV3.OperationObject | FlatOperation) => {
    const operationIdPath = kebab(operation.operationId!).split('-');
    return operationIdPath[0];
};

export const isOperationMutation = (method: HttpMethod, operation: OpenAPIV3.OperationObject | FlatOperation) => {
    // assuming no mutations for these methods
    if ([HttpMethod.GET, HttpMethod.HEAD, HttpMethod.OPTIONS, HttpMethod.TRACE].includes(method)) return false;

    const mainOperationCode = parseOpcode(operation);
    return !SEARCH_OPCODES.includes(mainOperationCode);
};

export const flattenPaths = (paths: OpenAPIV3.PathsObject) => {
    const pathNames = Object.keys(paths);

    return pathNames.flatMap(pathName => {
        const e = paths[pathName] as PathItemObject;
        const httpMethods = Object.keys(e) as HttpMethod[];
        return httpMethods.map<FlatOperation>(httpMethod => ({
            ...e[httpMethod as any],
            'x-path': pathName,
            'x-method': httpMethod,
            isMutation: isOperationMutation(httpMethod, e[httpMethod as any]),
        }));
    });
};

export const removeLeadingSlash = (path: string) => path.replace('/', '');

const extractSegment = (path: string) => {
    const segments = path.split('/');
    if (segments.length < 2) {
        return undefined;
    }
    return segments[1];
};

export const groupOperations = (flatOperation: FlatOperation[]) =>
    flatOperation.reduce((acc, cur) => {
        const groupName = extractSegment(cur['x-path']);
        if (!groupName) return acc;

        if (!(groupName in acc)) {
            acc[groupName] = [];
        }

        acc[groupName].push(cur);

        return acc;
    }, {} as Record<string, FlatOperation[]>);

export const renderImports = (sourceFile: SourceFile, imports: ImportData[]) => {
    const map = new Map<string, ImportData[]>();

    imports.forEach(el => {
        if (!map.has(el.from)) map.set(el.from, []);

        if (!map.get(el.from)!.find(e => e.name === el.name)) map.get(el.from)!.push(el);
    });

    const importFroms = [...map.keys()];

    importFroms.forEach(importFrom => {
        const els = map.get(importFrom)!;

        if (els.length === 1 && els[0].isDefault) {
            sourceFile.addImportDeclaration({
                namespaceImport: els[0].name,
                moduleSpecifier: els[0].from,
            });
        } else {
            sourceFile.addImportDeclaration({
                namedImports: els.map(e => e.name),
                moduleSpecifier: importFrom,
            });
        }
    });
};

export const hasPathParams = (op: FlatOperation) => {
    return !!op.parameters?.find(e => {
        if ('in' in e) {
            return e.in === 'path';
        }

        return false;
    });
};

export const hasFileUpload = (op: FlatOperation) => {
    const reqBody = op.requestBody as RequestBodyObject;
    if (!reqBody) return false;

    const contentKey: RequestContentType = 'multipart/form-data';
    if (!(contentKey in reqBody.content)) return false;

    return true;
};

export const extractOperationTypeNames = (operation: FlatOperation) => {
    const isMutation = isOperationMutation(operation['x-method'] as HttpMethod, operation);

    const response = pascal(operation.operationId + '_response');
    const responseData = pascal(operation.operationId + '_response_data');
    const responseMeta = pascal(operation.operationId + '_response_meta');
    let request: string | null = pascal(operation.operationId + '_request');

    if (isMutation) {
        return { request, response, responseData, responseMeta };
    }

    if (!operation.requestBody) {
        request = null;
    }

    return {
        request,
        response,
        responseData,
        responseMeta,
    };
};
