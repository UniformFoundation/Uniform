import degit from 'degit';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { copyFile, mkdir, readFile, rm, writeFile } from 'fs/promises';
import parser from 'gitignore-parser';
import { bold, cyan, gray, green, red } from 'kleur/colors';
import path from 'path';
import prettier from 'prettier';
import prettierBabel from 'prettier/parser-babel';
import prompts from 'prompts';
import glob from 'tiny-glob';
import yargsParser from 'yargs-parser';

import { viaContentsApi } from './github';
import { getUserPkgManager } from './util';

const gitIgnore = `
dist
.uniform
.output
.vercel
.netlify
netlify
# dependencies
/node_modules
# IDEs and editors
/.idea
.project
.classpath
*.launch
.settings/
# Temp
gitignore
# System Files
.DS_Store
Thumbs.db
`;

const disclaimer = `
Welcome to the Uniform setup wizard!
There are definitely bugs and some features might not work yet.
If you encounter an issue, have a look at https://github.com/UniformFoundation/Uniform/issues and open a new one, if it is not already tracked.
`;

async function main() {
    const { version } = require('../package.json');

    console.log(gray(`\ncreate-uniform-app version ${version}`));
    console.log(red(disclaimer));

    const args = yargsParser(process.argv.slice(2));

    const targetFolder: string =
        args[0] ||
        (
            await prompts({
                type: 'text',
                name: 'value',
                message: 'Where do you want to create',
                initial: 'my-app',
            })
        ).value;

    if (existsSync(targetFolder)) {
        if (readdirSync(targetFolder).length > 0) {
            const response = await prompts({
                type: 'confirm',
                name: 'value',
                message: 'Directory not empty. Continue?',
                initial: false,
            });

            if (!response.value) {
                process.exit(1);
            }
        }
    } else {
        await mkdir(targetFolder, {
            recursive: true,
        });
    }

    const config = {
        directory: args.example_dir ? args.example_dir : 'examples',
        repository: args.repo ? args.repo.split('/')[1] : 'Uniform',
        user: args.repo ? args.repo.split('/')[0] : 'UniformFoundation',
        ref: args.branch ? args.branch : 'main',
    };

    const templates: Record<string, any> = {};
    const templateDirs = (await viaContentsApi(config)).filter(d => d !== config.directory + '/' + '.DS_Store');

    templateDirs.forEach(dir => {
        let template = dir.replace('examples/', '');
        if (!templates[template]) {
            templates[template] = {
                name: template,
                js: true,
                ts: true,
            };
        }
    });

    const templateNames = [...Object.values(templates)];

    const templateName = (
        await prompts({
            type: 'select',
            name: 'template',
            message: 'Which template do you want to use?',
            choices: templateNames.map(template => ({ title: template.name, value: template.name })),
            initial: 0,
        })
    ).template;

    if (!templateName) {
        throw new Error('No template selected');
    }

    const tempTemplate = path.join(targetFolder, '.uniform');

    await new Promise((res, rej) => {
        const emitter = degit(`${config.user}/${config.repository}/${config.directory}/${templateName}#${config.ref}`, {
            cache: false,
            force: true,
            verbose: true,
        });

        emitter.on('info', info => {
            const ignore = ['found matching commit hash'];
            if (!ignore.some(ignorant => info.message.startsWith(ignorant))) {
                console.log(info.message);
            }
        });

        emitter
            .clone(path.join(process.cwd(), tempTemplate))
            .then(() => {
                res({});
            })
            .catch(err => rej(err));
    });

    const templateDir = path.join(process.cwd(), tempTemplate);

    const gitignore_contents = gitIgnore;
    const gitignore = parser.compile(gitignore_contents);

    const files = (await glob('**/*', { cwd: templateDir })).filter(gitignore.accepts);

    // let writtenFiles = 1;
    await Promise.all(
        files.map(async file => {
            // console.log(green(`${writtenFiles} / ${files.length} written...`));

            const src = path.join(templateDir, file);
            const dest = path.join(targetFolder, file);

            if (statSync(src).isDirectory()) {
                await mkdir(dest, {
                    recursive: true,
                });
            } else {
                let code = (await readFile(src)).toString();

                // if (src.includes('vite.config') && !code.includes('ssr: false') && !ssr) {
                //     code = code.replace(`solid({`, `solid({ ssr: false, `).replace(`solid()`, `solid({ ssr: false })`);
                // }

                if (src.endsWith('.ts')) {
                    await writeFile(dest, prettier.format(code, { parser: 'babel-ts', plugins: [prettierBabel] }));
                } else {
                    await copyFile(src, dest);
                }
            }
        })
    );

    await writeFile(path.join(targetFolder, '.gitignore'), gitignore_contents);

    const name = path.basename(path.resolve(targetFolder));

    const pkg_file = path.join(targetFolder, 'package.json');
    const pkg_json = JSON.parse(
        readFileSync(pkg_file, 'utf-8')
            .replace(/"name": ".+"/, _m => `"name": "${name}"`)
            .replace(/"(.+)": "workspace:.+"/g, (_m, name) => `"${name}": "next"`)
    ); // TODO ^${versions[name]}

    await writeFile(pkg_file, JSON.stringify(pkg_json, null, 2));

    await rm(path.join(process.cwd(), tempTemplate), {
        recursive: true,
        force: true,
    });

    console.log(bold(green('✔ Copied project files')));

    console.log('\nNext steps:');
    let i = 1;

    const relative = path.relative(process.cwd(), targetFolder);
    if (relative !== '') {
        console.log(`  ${i++}: ${bold(cyan(`cd ${relative}`))}`);
    }

    const userPkgManager = getUserPkgManager();

    console.log(`  ${i++}: ${bold(cyan(`${userPkgManager} install`))}`);

    const devCommand = [`${userPkgManager} run dev`, userPkgManager === 'npm' ? '--' : ''].filter(Boolean).join(' ');
    console.log(`  ${i++}: ${bold(cyan(devCommand))}`);

    console.log(`\nTo close the dev server, hit ${bold(cyan('Ctrl-C'))}`);
}

export default main;

main().catch(console.error);
