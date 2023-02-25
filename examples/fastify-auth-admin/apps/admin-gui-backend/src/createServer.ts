import circuitBreaker from '@fastify/circuit-breaker';
import formBody from '@fastify/formbody';
import helmet from '@fastify/helmet';
import { getEnvironment } from '@scripts/env';
import Fastify, { RequestGenericInterface } from 'fastify';
import multer from 'fastify-multer';
import serveStoplight from 'fastify-serve-stoplight';
import { ReadStream } from 'fs';
import path, { resolve } from 'path';
import pino from 'pino';
import { APIv1 } from './http/apiV1';

import { NotFoundError } from './http/apiV1/common/errors/NotFoundError';

// import API from './api';

// Declaration merging
declare module 'fastify' {
    type JsonResponse = {
        data?: unknown | unknown[];
        meta?: Record<string, unknown>;
        errors?: {
            error?: string;
            code: string;
            message: string;
            statusCode?: number;
            stack?: string;
            cause?: unknown;
        }[];
    };

    type ReplyWith = string | JsonResponse | ReadStream | Buffer | Error;

    export interface ReplyGenericInterface {
        Reply?: ReplyWith;
    }

    export interface RouteGenericInterface extends RequestGenericInterface, ReplyGenericInterface {
        Reply?: ReplyWith;
    }

    // export interface FastifyInstance {
    //     prisma: PrismaClient;
    // }
}

const rootPath = resolve(__dirname, '../');

async function createServer() {
    const { LOG_LEVEL, APP_NAME } = getEnvironment();

    const app = Fastify({
        return503OnClosing: true,
        pluginTimeout: 1000,
        ignoreTrailingSlash: true,
        ignoreDuplicateSlashes: true,
        logger: pino({
            level: LOG_LEVEL,
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: true,
                },
            },
        }),
    });

    // const prisma = new PrismaClient({});
    // app.decorate('prisma', prisma);

    // TODO: env
    app.register(circuitBreaker, {
        threshold: 3,
        timeout: 10000,
        resetTimeout: 10000,
    });

    app.register(serveStoplight, {
        path: path.resolve(rootPath, 'public/api-docs'),
        prefix: '/docs/api/',
        appName: APP_NAME,
        cachePath: path.resolve(rootPath, 'storage/cache/api-docs'),
    });

    app.setNotFoundHandler(async req => {
        throw new NotFoundError({
            endpoint: req.url,
            params: req.params || null,
            body: req.body || null,
        });
    });

    app.setErrorHandler(async (err, req, reply) => {
        const error = {
            code: err.code,
            error: err.name,
            message: err.message,
            statusCode: err.statusCode || Number(err.code) || 500,
            stack: err.stack,
            cause: err.cause,
        };

        app.log.error(error, `Request #${req.id} (${req.url}) error ${error.code}`);

        await reply.status(500).send({
            data: null,
            meta: {},
            errors: [error],
        });
    });

    // TODO: https://www.npmjs.com/package/fastify-multer

    app.register(multer.contentParser);
    app.register(formBody);
    app.register(helmet, {
        global: true,
    });

    app.register(APIv1);

    // app.register(API);
    // app.register(now, {
    //   routesFolder: path.join(__dirname, './routes'),
    // });

    await app.ready();

    return app;
}

export default createServer;
