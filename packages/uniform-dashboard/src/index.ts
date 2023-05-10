import { generatePage } from './helpers';
import { generateTable } from './templates/components/table';
import { renderTablePage } from './templates/pages/tablePage';


renderTablePage('TestEntity');

// import { Project } from 'ts-morph';

// // create a new project
// const project = new Project();

// // create a new source file
// const sourceFile = project.createSourceFile('Page.tsx', '', { overwrite: true });

// // add the necessary import statements
// // const reactImport = sourceFile.addImportDeclaration({
// //     namespaceImport: 'React',
// //     moduleSpecifier: 'react',
// // });

// sourceFile.addImportDeclaration({
//     namedImports: ['useState'],
//     moduleSpecifier: 'react',
// });

// // add the necessary types for the component props and state
// const pageComponentInterface = sourceFile.addInterface({
//     name: 'PageProps',
//     isExported: true,
//     properties: [],
// });

// // create a new function component with a useState hook
// const pageComponent = sourceFile.addFunction({
//     name: 'Page',
//     isExported: true,
//     isDefaultExport: true,
//     parameters: [],
//     statements: writer => {
//         writer.writeLine('const [num, setNum] = useState(1);');
//         writer.writeLine('return (');
//         writer.writeLine('  <div>');
//         writer.writeLine(`    <span>{num}</span>`);
//         writer.writeLine('    <button onClick={() => setNum(num + 1)}>+1</button>');
//         writer.writeLine('  </div>');
//         writer.writeLine(');');
//     },
// });

// // format the source code
// sourceFile.formatText();

// // print the resulting code
// console.log(sourceFile.getFullText());
