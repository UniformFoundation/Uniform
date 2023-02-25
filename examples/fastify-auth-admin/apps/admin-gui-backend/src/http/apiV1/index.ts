import { FastifyInstance, FastifyPluginAsync } from 'fastify';

import { ExamplesRoutes } from './openApiGenerated/examples/routes';

export const APIv1: FastifyPluginAsync = async (fastify: FastifyInstance) => {
    fastify.register(ExamplesRoutes, { prefix: '/examples' });
};
