import { FileInfo } from '@apidevtools/json-schema-ref-parser/dist/lib/types';
import { readFile } from 'fs/promises';
import jsYaml from 'js-yaml';

import { ISchemaLoader } from './types';

const resolvePath = (path: string, against: string) => {
    console.log('resolving path: ' + path, 'against', against);
    return path;
};

const valueOrArrayElement = (value: any) => {
    if (Array.isArray(value) && value.length) return value[0];
    if (Array.isArray(value) && !value.length) return null;

    return value;
};

export class FileLoader implements ISchemaLoader {
    private path!: string;

    constructor(path: string) {
        this.path = path;
    }

    public async load() {
        const indexSchemaContent = await readFile(this.path, 'utf-8');
        return valueOrArrayElement(jsYaml.loadAll(indexSchemaContent)) as object;
    }

    public async readPortion(file: FileInfo, cb: (error: any, result: any) => any) {
        if (file.url.includes('json-schema-ref-parser/dist/')) {
            const realPath = resolvePath(file.url.split('json-schema-ref-parser/dist/')[1], __dirname);
            const res = await readFile(realPath, 'utf-8');
            cb(undefined, res);
            return res;
        }

        const res = readFile(file.url, 'utf-8');
        cb(undefined, res);
        return res;
    }
}
