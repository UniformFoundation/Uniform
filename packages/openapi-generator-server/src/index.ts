#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';

import { generate } from './new-generators';
import { pathsToControllersRoutes } from './parse-controller-schema';
import { parseSchema } from './parse-yaml-schema';
import { resolvePath } from './utils';

// TODO: clone https://github.com/Q42/openapi-typescript-validator

const options = yargs(process.argv.slice(2))
    .options({
        root: { type: 'string', demandOption: true },
        out: { type: 'string', demandOption: true },
        prettierrc: { type: 'string', demandOption: true },
    })
    .parseSync();

if (path.extname(options.root) !== '.yaml' || !fs.lstatSync(options.root).isFile()) {
    throw new Error(`Must provide absolute path to index.yaml file, given: ${options.root}`);
}

if (!fs.lstatSync(options.prettierrc).isFile()) {
    throw new Error(`Must provide a valid path to .prettierrc file, given: ${options.prettierrc}`);
}

async function main() {
    const pathToIndex = resolvePath(options.root);
    const pathToPrettierrc = resolvePath(options.prettierrc);
    const schema = await parseSchema(pathToIndex);

    const controllerSchema = await pathsToControllersRoutes(schema);

    // eslint-disable-next-line import/no-dynamic-require, global-require
    const prettierConfig = require(pathToPrettierrc);

    await generate(
        {
            outDirectory: resolvePath(options.out),
            schemeInterfaces: {},
            prettierOptions: {
              parser: 'typescript',
              ...prettierConfig,
              plugins: [],
            },
        },
        controllerSchema
    );
}

main().catch(console.error);

// TODO:
// 1) async resolve refs
// 2) generate:
// controllers:
/**
 * paths:
  /common/files/download-protected:
    $ref: './common/paths.yaml#/FilesDownloadProtected'

  /auth/login:
    $ref: './auth/paths.yaml#/Login'
  /auth/logout:
    $ref: './auth/paths.yaml#/Logout'
  /auth/refresh:
    $ref: './auth/paths.yaml#/Refresh'
  /auth/current-user:
    $ref: './auth/paths.yaml#/CurrentUser'
 */

/**
 * results to:
 * export class LoginRequest {
 *   static parser = (new Ajv({
 *      coerceTypes: true,
 *   })).compile({
 *      properties: []
 *          { name: 'login', type: 'string' },
 *          { name: 'password', type: 'string' },
 *      },
 *      required: ['username', 'password']
 *   });
 *
 *   data: ReturnType<typeof ajv.parse>;
 *
 *   constructor(from: object) {
 *     this.data = LoginRequest.parser(from);
 *   }
 * }
 *
 * export class AuthController {
 *    \/**
 *      Вход в систему по логину/паролю
 *    *\/
 *    async login(body: ) {
 *    }
 *    async logout() {
 *    }
 *    async refresh() {
 *    }
 *    async currentUser() {
 *    }
 * }
 */
// routes

// generate({
//     schemaFile: options.root,
//     schemaType: 'yaml',
//     directory: options.out,
//     // standalone: {
//     //     validatorOutput: 'commonjs',
//     //     mergeDecoders: true,
//     // }
// }).then(() => {
//     console.log('✅ Generated files to', options.out);
// });
