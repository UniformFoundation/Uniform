import CodeBlockWriter from 'code-block-writer';
import { Project } from 'ts-morph';

import { ComponentStructure } from './types';

export const createCodeWriters = () => {
    const render = new CodeBlockWriter({
        newLine: '\n',
        indentNumberOfSpaces: 4,
        useTabs: false,
        useSingleQuote: true,
    });

    const hooks = new CodeBlockWriter({
        newLine: '\n',
        indentNumberOfSpaces: 4,
        useTabs: false,
        useSingleQuote: true,
    });

    return { render, hooks };
};

export interface PageOptions {
    name?: string;
    render: () => string;
}

export const generatePage = (orderedComponents: Omit<ComponentStructure, 'renderCode'>[], { name = 'Page', render }: PageOptions) => {
    const project = new Project();

    const sourceFile = project.createSourceFile(name, '', { overwrite: true });

    orderedComponents.forEach(component => {
        const imports = Object.entries(component.imports);

        imports.forEach(imprt => {
            sourceFile.addImportDeclaration({
                namedImports: imprt[1],
                moduleSpecifier: imprt[0],
            });
        });
    });

    const totalHooksCode = orderedComponents.map(e => e.hooksCode).join('\n');

    const pageComponent = sourceFile.addFunction({
        name,
        isExported: true,
        isDefaultExport: true,
        parameters: [],
        statements: writer => {
            writer.writeLine(totalHooksCode);
            writer.writeLine('return (');
            writer.writeLine(render())
            writer.writeLine(');');
        },
    });
    
    // format the source code
    sourceFile.formatText();
    
    return {
        pageComponent,
        sourceFile,
    }
};
