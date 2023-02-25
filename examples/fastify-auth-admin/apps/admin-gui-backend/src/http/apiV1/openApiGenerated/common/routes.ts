/**
 * This file was initially auto-generated. Its content may be changed on the next generation.
 */
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { DownloadProtectedFileSchema, DownloadProtectedFileSchemaType } from './schemas';

export const CommonRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
    fastify.post<DownloadProtectedFileSchemaType>('/files/download-protected', {
        handler: async (req, res) => {
            // TODO: user code goes here
            throw new Error('Not implemented');
        },
        schema: DownloadProtectedFileSchema,
    });
};
