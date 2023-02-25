import { Static, TObject } from '@sinclair/typebox';
import Ajv from 'ajv';
import dotenv from 'dotenv';

import { EnvironmentSchema } from '../config/env';

const extractEnumValues = (prop: any) => {
    if (typeof prop !== 'object') return null;

    if (!('anyOf' in prop)) return null;

    return (prop.anyOf as any[]).map(e => e.const as string);
};

/**
 * Генерирует .env.example исходя из схемы environment
 * @returns
 */
export function generateDotenvExample<T extends TObject>(schema: T) {
    let dotEnvExample = '';

    const propNames = Object.keys(schema.properties);

    for (let i = 0; i < propNames.length; i += 1) {
        const prop = propNames[i];

        const currentPrefix = prop.split('_')[0];
        const lastPrefix = i >= 1 ? propNames[i - 1].split('_')[0] : currentPrefix;

        const isPrefixChanged = currentPrefix !== lastPrefix;

        const {
            examples,
            description,
            default: defaultValue,
        } = schema.properties[prop as keyof typeof schema.properties];

        let example = '';

        if (examples?.length) {
            if (typeof defaultValue !== 'undefined') {
                example = (examples as any[]).find(e => e === defaultValue);
            } else {
                // eslint-disable-next-line prefer-destructuring
                example = examples[0];
            }
        }

        const enumValues = extractEnumValues(schema.properties[prop]);
        const values = enumValues ? ` (values: ${enumValues.join(', ')})` : '';

        if (description) {
            dotEnvExample += `## ${description}${values}\n`;
        }

        if (isPrefixChanged) dotEnvExample += '\n';
        dotEnvExample += `${prop}=${example}\n`;
    }

    return dotEnvExample;
}

const ajv = new Ajv({
    coerceTypes: true,
});

const validate = ajv.compile(EnvironmentSchema);

export function getEnvironment() {
    const envData = dotenv.config().parsed;
    const result = validate(envData);

    if (!result) {
        throw new Error(`Loading .env:\n${JSON.stringify(validate.errors, undefined, 2)}`);
    }

    return envData as unknown as Static<typeof EnvironmentSchema>;
}
