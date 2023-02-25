import { Type } from '@sinclair/typebox';

export enum AppEnv {
    LOCAL = 'local',
    STAGE = 'stage',
    PROD = 'prod',
}

export const EnvironmentSchema = Type.Object({
    APP_NAME: Type.String({
        description: 'Application name is used in logs and prefixes',
        examples: ['Fastify APP'],
    }),
    APP_PORT: Type.Number({
        description: 'Application port',
        examples: [3000],
    }),
    APP_ENV: Type.Enum(AppEnv, {
        description: 'Application environment, used in various checks',
        examples: ['local'],
    }),
    APP_CIPHER: Type.String({
        description: 'Cipher algorithm',
        examples: ['AES-256-CBC'],
        default: 'AES-256-CBC',
    }),
    APP_KEY: Type.String({
        description: 'Encryption key',
        minLength: 32,
    }),
    APP_DEBUG: Type.Boolean({
        description: 'Is debug enabled? Adds stack traces',
        examples: ['true', 'false'],
    }),
    APP_URL: Type.String({
        description: 'A static URL for the application. Used for emails',
        examples: ['http://localhost:3000/'],
    }),

    LOG_LEVEL: Type.String({}),

    DB_CONNECTION: Type.String(),
    DB_HOST: Type.String(),
    DB_PORT: Type.Number(),
    DB_DATABASE: Type.String(),
    DB_USERNAME: Type.String(),
    DB_PASSWORD: Type.String(),

    CACHE_DRIVER: Type.String(),
    FILESYSTEM_DISK: Type.String(),
});
