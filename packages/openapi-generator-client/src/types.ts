import { FileInfo } from '@apidevtools/json-schema-ref-parser/dist/lib/types';
import { OperationObject } from 'openapi-typescript';

export interface ISchemaLoader {
    readPortion: (file: FileInfo, cb: (error: any, result: any) => any) => Promise<string>;
    load: () => Promise<object>;
}

export interface ImportData {
    from: string;
    name: string;
    isDefault?: boolean; // default false
}

export type FlatOperation = OperationObject & { ['x-path']: string; ['x-method']: string; isMutation: boolean };

export type OverridePolicy = 'override' | 'skip'; // TODO: augment
