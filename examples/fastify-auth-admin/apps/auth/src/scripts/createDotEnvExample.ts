/* eslint-disable no-console */

/* eslint-disable prefer-template */
import fs from 'fs';
import { resolve } from 'path';

import { EnvironmentSchema } from '../config/env';
import { generateDotenvExample } from './env';

const GREEN = '\x1b[0;32m';
const COL_RESET = '\x1b[39;49;00m';

const pathToEnvExample = resolve(__dirname, '..', '..', '.env.example');

if (fs.existsSync(pathToEnvExample)) {
    console.log(GREEN + pathToEnvExample + ' already exists.', COL_RESET);
    process.exit(0);
}

const example = generateDotenvExample(EnvironmentSchema);

fs.writeFileSync(pathToEnvExample, example);
console.log(GREEN + pathToEnvExample + ` is created!${COL_RESET}`);
