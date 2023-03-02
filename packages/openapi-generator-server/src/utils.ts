import { access } from 'fs/promises';
import { isAbsolute, resolve } from 'path';
import type { Options } from 'prettier';

export type HTTPMethod = 'POST' | 'GET' | 'PATCH' | 'PUT' | 'DELETE';

export function isHTTPMethod(str: string): str is HTTPMethod {
    return ['POST', 'GET', 'PATCH', 'PUT', 'DELETE'].includes(str);
}

export const resolvePath = (absoluteOrRelativePath: string, relativeTo = process.cwd()) => {
    if (isAbsolute(absoluteOrRelativePath)) return absoluteOrRelativePath;

    return resolve(relativeTo, absoluteOrRelativePath).replace(/\\/g, '/');
};

export const ucFirst = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

export function extractNameFromPath(path: string) {
    const pathWithoutFirstSlash = path[0] === '/' ? path.slice(1) : path;
    const trimmedPath =
        pathWithoutFirstSlash[pathWithoutFirstSlash.length - 1] === '/'
            ? pathWithoutFirstSlash.slice(0, pathWithoutFirstSlash.length - 1)
            : pathWithoutFirstSlash;

    const pathConverted = trimmedPath.replace(/[{}()]/g, '').replace(/-/g, '/');

    return pathConverted.split('/').map(ucFirst).join('');
}

export async function fileExists(path: string) {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}

export interface GeneratorOptions {
    outDirectory: string;
    prettierOptions: Options;

    schemeInterfaces: {
        groupPrefix?: boolean;
    };
}
