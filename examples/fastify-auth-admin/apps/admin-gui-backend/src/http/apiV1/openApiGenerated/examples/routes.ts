/**
 * This file was initially auto-generated. Its content may be changed on the next generation.
 */
import { FastifyInstance, FastifyPluginAsync } from 'fastify';

import { GetExampleEntitySchema, GetExampleEntitySchemaType } from './schemas';

export const ExamplesRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
    fastify.get<GetExampleEntitySchemaType>('/:id', {
        handler: async (req, res) => {
            console.log(req.params.id);
            // TODO: user code goes here
            return res.send({
                data: {
                    id: req.params.id!,
                },
            });
        },
        schema: GetExampleEntitySchema,
    });
};
