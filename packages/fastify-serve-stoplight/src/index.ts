import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { createReadStream } from 'fs';
import fs, { mkdir } from 'fs/promises';
import { resolve } from 'path';
import { parse, stringify } from 'yaml';

export interface Options {
    // Path to docs root, example - public/api-docs
    // contains v1, v2, ...
    path: string;

    // Default /docs/api
    prefix?: string;

    appName: string;

    /** @default storage/cache */
    cachePath?: string;
}

const storagePath = resolve(__dirname, '../storage');
const indexTemplatePath = resolve(storagePath, 'index.html');

async function fastifyServeStoplight(
    fastify: FastifyInstance,
    { appName, path, prefix: globalPrefix = '/docs/api', cachePath = resolve(storagePath, 'cache') }: Options,
    next: any
) {
    const cleanPrefix = `${globalPrefix}/`.replace(/([\\/]+)/g, '/');

    const versions = await fs.readdir(path);

    await Promise.all(
        versions.map(async version => {
            const title = `${appName} ${version}`;

            const root = resolve(path, version);
            const prefix = cleanPrefix + version;

            fastify.register(fastifyStatic, {
                root,
                prefix,
                decorateReply: false,
            });

            const indexTemplate = await fs.readFile(indexTemplatePath, 'utf-8');

            let indexHtml = indexTemplate.replace(/{{ title }}/g, title);
            indexHtml = indexHtml.replace(/{{ schemaUrl }}/g, `${version}/index.yaml`);

            const cacheRoot = resolve(cachePath, version);
            await mkdir(cacheRoot, { recursive: true });

            const cacheIndexHtml = resolve(cacheRoot, 'index.html');
            const cacheIndexYaml = resolve(cacheRoot, 'index.yaml');

            const indexYamlContent = await fs.readFile(resolve(root, 'index.yaml'), 'utf-8');
            const indexYamlObj = parse(indexYamlContent);

            indexYamlObj.info = {
                ...indexYamlObj.info,
                title,
            };

            const newYamlContent = stringify(indexYamlObj);

            await Promise.all([fs.writeFile(cacheIndexYaml, newYamlContent), fs.writeFile(cacheIndexHtml, indexHtml)]);

            // /docs/api/v1 -> storage/cache/v1/index.html
            fastify.get(prefix, async (_, res) => {
                res.header('Content-Type', 'text/html')
                    .header('Content-Security-Policy', undefined)
                    .header('Cross-Origin-Embedder-Policy', undefined)
                    .header('Cross-Origin-Opener-Policy', undefined)
                    .header('Cross-Origin-Resource-Policy', undefined);

                return res.send(createReadStream(cacheIndexHtml));
            });

            // /docs/api/v1/index.yaml -> storage/cache/v1/index.yaml
            fastify.get(`${prefix}/index.yaml`, async (_, res) => {
                const content = createReadStream(cacheIndexYaml);
                res.header('Content-Type', 'application/octet-stream')
                    .header('Content-Security-Policy', undefined)
                    .header('Cross-Origin-Embedder-Policy', undefined)
                    .header('Cross-Origin-Opener-Policy', undefined)
                    .header('Cross-Origin-Resource-Policy', undefined);

                return res.send(content);
            });
        })
    );

    next();
}

const plugin = fp(fastifyServeStoplight, {
    fastify: '4.x',
    name: 'fastify-server-stoplight',
});

export default plugin;
