/**
 * This file was initially auto-generated. Its content may be changed on the next generation.
 */
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
    LoginSchema,
    LoginSchemaType,
    LogoutSchema,
    LogoutSchemaType,
    RefreshSchema,
    RefreshSchemaType,
    GetCurrentUserSchema,
    GetCurrentUserSchemaType,
} from './schemas';

export const AuthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
    fastify.post<LoginSchemaType>('/login', {
        handler: async (req, res) => {
            // TODO: user code goes here
            throw new Error('Not implemented');
        },
        schema: LoginSchema,
    });

    fastify.get<LogoutSchemaType>('/logout', {
        handler: async (req, res) => {
            // TODO: user code goes here
            throw new Error('Not implemented');
        },
        schema: LogoutSchema,
    });

    fastify.post<RefreshSchemaType>('/refresh', {
        handler: async (req, res) => {
            // TODO: user code goes here
            throw new Error('Not implemented');
        },
        schema: RefreshSchema,
    });

    fastify.get<GetCurrentUserSchemaType>('/current-user', {
        handler: async (req, res) => {
            // TODO: user code goes here
            throw new Error('Not implemented');
        },
        schema: GetCurrentUserSchema,
    });
};
