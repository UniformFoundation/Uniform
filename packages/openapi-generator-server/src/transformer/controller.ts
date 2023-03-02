// @see https://ts-ast-viewer.com/#
import ts from 'typescript';

import { HTTPMethod, isHTTPMethod } from '../utils';

function isApiDecorator(node: ts.Decorator) {
    if (ts.isCallExpression(node.expression)) {
        if (ts.isIdentifier(node.expression.expression)) {
            return isHTTPMethod(node.expression.expression.escapedText.toString());
        }
    }

    return false;
}

function isApiMethod(modifiers: ts.ModifierLike[] | ts.NodeArray<ts.ModifierLike>): boolean {
    return modifiers.some(modifier => {
        if (ts.isDecorator(modifier)) {
            return isApiDecorator(modifier);
        }
    });
}

interface RestDecoratorInfo {
    node: ts.Decorator;
    arg?: Record<string, any>;
}

interface MethodInfo {
    node: ts.MethodDeclaration;
    httpDecorators: Map<HTTPMethod, RestDecoratorInfo>;
    reqTypeName: string;
    resTypeName: string;
}

interface GlobalInfo {
    className?: string;
    classNode?: ts.ClassDeclaration;
    imports?: any;
    methods: Map<string, MethodInfo>;
}

export interface ControllerDesiredData {
    className: string;
    imports: Record<string, string[]>;
    methods: Record<
        string,
        {
            reqSchemaName: string;
            resTypeName: string;
            decorators: {
                [key in HTTPMethod]?: {
                    url: string;
                    schemaName: string;
                    options: Record<string, string>;
                };
            };
        }
    >;
}

/**
 * 
 * @param code 
 * @param desiredData
 * @example const desiredData: DesiredData = {
    className: 'AuthController',
    imports: {},
    methods: {
        loginHandler: {
            reqSchemaName: 'LoginSchemaType',
            resTypeName: 'FastifyReply',
            decorators: {
                POST: {
                    url: '/login',
                    schemaName: 'LoginSchema',
                    options: {
                        bodyLimit: '1024 * 1024 * 8',
                    },
                },
            },
        },
        logoutHandler: {
            reqSchemaName: 'LogoutSchemaType',
            resTypeName: 'FastifyReply',
            decorators: {
                GET: {
                    url: '/logout',
                    schemaName: 'LogoutSchema',
                    options: {},
                },
            },
        },
    },
};
 */
export function transformController(code: string, desiredData: ControllerDesiredData): string {
    const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest);

    const globalInfo: GlobalInfo = {
        methods: new Map<string, MethodInfo>(),
    };
    const createdMethodNames: string[] = [];
    const methodsToDelete: ts.Node[] = [];

    const classNameTransformer = (ctx: ts.TransformationContext) => {
        return (src: ts.SourceFile) => {
            const visitor = (node: ts.Node): ts.Node => {
                if (ts.isClassDeclaration(node)) {
                    const nodeName = node.name;
                    if (!nodeName) {
                        throw new Error('Class must have a name');
                    }

                    if (ts.isIdentifier(nodeName)) {
                        const className = nodeName.escapedText.toString();

                        globalInfo.className = className;
                        globalInfo.classNode = node;
                    }

                    return ts.factory.updateClassDeclaration(
                        node,
                        node.modifiers,
                        ts.factory.createIdentifier(desiredData.className),
                        node.typeParameters,
                        node.heritageClauses,
                        node.members
                    );
                }

                return ts.visitEachChild(node, visitor, ctx);
            };

            return ts.visitNode(src, visitor);
        };
    };

    const createMethodsTransformer = (ctx: ts.TransformationContext) => {
        const desiredMethodNames = Object.keys(desiredData.methods);

        return (src: ts.SourceFile) => {
            const visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
                if (ts.isClassDeclaration(node)) {
                    const { members } = node;

                    const existingMethodNames: string[] = [];

                    for (const member of members) {
                        if (ts.isMethodDeclaration(member)) {
                            if (ts.isIdentifier(member.name)) {
                                const name = member.name.escapedText.toString();
                                const isApi = isApiMethod(member.modifiers || []);

                                if (isApi && !desiredMethodNames.includes(name)) {
                                    // Should remove API method that is not defined
                                    methodsToDelete.push(member);
                                } else {
                                    existingMethodNames.push(name);
                                }
                            }
                        }
                    }

                    const newMethods: ts.ClassElement[] = [];

                    for (const methodName of desiredMethodNames) {
                        if (!existingMethodNames.includes(methodName)) {
                            const newBody = ts.factory.createBlock(
                                [
                                    ts.factory.createThrowStatement(
                                        ts.factory.createNewExpression(
                                            ts.factory.createIdentifier('Error'),
                                            undefined,
                                            [ts.factory.createStringLiteral('TODO: implement handler')]
                                        )
                                    ),
                                ],
                                true
                            );

                            const decorators: ts.Decorator[] = [];

                            const methodInfo = desiredData.methods[methodName];
                            for (const [httpMethod, decoratorData] of Object.entries(methodInfo.decorators)) {
                                const newDecorator = ts.factory.createDecorator(
                                    ts.factory.createCallExpression(
                                        ts.factory.createIdentifier(httpMethod),
                                        undefined,
                                        [
                                            ts.factory.createObjectLiteralExpression(
                                                [
                                                    ts.factory.createPropertyAssignment(
                                                        ts.factory.createIdentifier('url'),
                                                        ts.factory.createStringLiteral(decoratorData.url)
                                                    ),
                                                    ts.factory.createPropertyAssignment(
                                                        ts.factory.createIdentifier('options'),
                                                        ts.factory.createObjectLiteralExpression(
                                                            [
                                                                ts.factory.createPropertyAssignment(
                                                                    ts.factory.createIdentifier('schema'),
                                                                    ts.factory.createIdentifier(
                                                                        decoratorData.schemaName
                                                                    )
                                                                ),
                                                            ],
                                                            true
                                                        )
                                                    ),
                                                ],
                                                true
                                            ),
                                        ]
                                    )
                                );
                                decorators.push(newDecorator);
                            }

                            const newMethod = ts.factory.createMethodDeclaration(
                                decorators,
                                undefined,
                                methodName,
                                undefined,
                                [] as ts.TypeParameterDeclaration[],
                                [
                                    ts.factory.createParameterDeclaration(
                                        undefined,
                                        undefined,
                                        ts.factory.createIdentifier('req'),
                                        undefined,
                                        ts.factory.createTypeReferenceNode(
                                            ts.factory.createIdentifier('FastifyRequest'),
                                            [
                                                ts.factory.createTypeReferenceNode(
                                                    ts.factory.createIdentifier(methodInfo.reqSchemaName),
                                                    undefined
                                                ),
                                            ]
                                        ),
                                        undefined
                                    ),
                                    ts.factory.createParameterDeclaration(
                                        undefined,
                                        undefined,
                                        ts.factory.createIdentifier('res'),
                                        undefined,
                                        ts.factory.createTypeReferenceNode(
                                            ts.factory.createIdentifier(methodInfo.resTypeName),
                                            undefined
                                        ),
                                        undefined
                                    ),
                                ],
                                undefined,
                                newBody
                            );

                            createdMethodNames.push(methodName);
                            newMethods.push(newMethod);
                        }
                    }

                    return ts.factory.updateClassDeclaration(
                        node,
                        node.modifiers,
                        node.name,
                        node.typeParameters,
                        node.heritageClauses,
                        [...node.members, ...newMethods]
                    );
                }

                return ts.visitEachChild(node, visitor, ctx);
            };

            return ts.visitNode(src, visitor);
        };
    };

    const patchMethodsTransformer = (ctx: ts.TransformationContext) => {
        return (src: ts.SourceFile) => {
            const visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
                if (ts.isMethodDeclaration(node)) {
                    if (methodsToDelete.includes(node)) return undefined;
                    if (!ts.isIdentifier(node.name)) return node;

                    const name = node.name.escapedText.toString();
                    if (createdMethodNames.includes(name)) return node;

                    const isApi = isApiMethod(node.modifiers || []);
                    if (!isApi) return node;

                    const methodInfo = desiredData.methods[name];
                    const newModifiers: ts.ModifierLike[] = [];

                    const visitedDesiredDecorators: typeof methodInfo['decorators'][HTTPMethod][] = [];

                    for (const modifier of node.modifiers!) {
                        if (ts.isDecorator(modifier)) {
                            const isApi = isApiDecorator(modifier);

                            if (isApi) {
                                const apiCallExpr = modifier.expression;

                                if (ts.isCallExpression(apiCallExpr)) {
                                    if (ts.isIdentifier(apiCallExpr.expression)) {
                                        const decoratorName =
                                            apiCallExpr.expression.escapedText.toString() as HTTPMethod;
                                        const decoratorInfo = methodInfo.decorators[decoratorName];

                                        visitedDesiredDecorators.push(decoratorInfo);

                                        const newDecoratorProperties: ts.PropertyAssignment[] = [];

                                        const arg = apiCallExpr.arguments[0];

                                        if (ts.isObjectLiteralExpression(arg)) {
                                            for (const argProp of arg.properties) {
                                                if (ts.isPropertyAssignment(argProp)) {
                                                    if (ts.isIdentifier(argProp.name)) {
                                                        const fieldName = argProp.name.escapedText.toString();

                                                        if (fieldName === 'url') {
                                                            const desiredUrl = decoratorInfo?.url;

                                                            newDecoratorProperties.push(
                                                                ts.factory.createPropertyAssignment(
                                                                    ts.factory.createIdentifier('url'),
                                                                    ts.factory.createStringLiteral(desiredUrl!)
                                                                )
                                                            );
                                                        } else if (fieldName === 'options') {
                                                            // TODO: combine options!!! currently leaves as it is
                                                            console.log(
                                                                `Not changing ${decoratorName} options because its not easy`
                                                            );
                                                            newDecoratorProperties.push(argProp);
                                                        } else {
                                                            console.log('field', fieldName);
                                                            newDecoratorProperties.push(argProp);
                                                        }
                                                    }
                                                }
                                            }
                                        }

                                        const objLiteral = ts.factory.createObjectLiteralExpression(
                                            newDecoratorProperties,
                                            true
                                        );

                                        newModifiers.push(
                                            ts.factory.createDecorator(
                                                ts.factory.createCallExpression(
                                                    ts.factory.createIdentifier(decoratorName),
                                                    undefined,
                                                    [objLiteral]
                                                )
                                            )
                                        );

                                        continue;
                                    }
                                }
                            }
                        }
                    }

                    for (const [k, v] of Object.entries(methodInfo.decorators)) {
                        if (!visitedDesiredDecorators.includes(v)) {
                            // IT IS UNVISITED! must create new!
                            const httpMethod = k as HTTPMethod;
                            const newDecorator = ts.factory.createDecorator(
                                ts.factory.createCallExpression(ts.factory.createIdentifier(httpMethod), undefined, [
                                    ts.factory.createObjectLiteralExpression(
                                        [
                                            ts.factory.createPropertyAssignment(
                                                ts.factory.createIdentifier('url'),
                                                ts.factory.createStringLiteral(v.url)
                                            ),
                                            ts.factory.createPropertyAssignment(
                                                ts.factory.createIdentifier('options'),
                                                ts.factory.createObjectLiteralExpression(
                                                    [
                                                        ts.factory.createPropertyAssignment(
                                                            ts.factory.createIdentifier('schema'),
                                                            ts.factory.createIdentifier(v.schemaName)
                                                        ),
                                                    ],
                                                    true
                                                )
                                            ),
                                        ],
                                        true
                                    ),
                                ])
                            );

                            newModifiers.push(newDecorator);
                        }
                    }

                    newModifiers.push(...node.modifiers!.filter(e => !ts.isDecorator(e)));

                    const newParameters = [
                        ts.factory.createParameterDeclaration(
                            undefined,
                            undefined,
                            ts.factory.createIdentifier('req'),
                            undefined,
                            ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('FastifyRequest'), [
                                ts.factory.createTypeReferenceNode(
                                    ts.factory.createIdentifier(methodInfo.reqSchemaName),
                                    undefined
                                ),
                            ]),
                            undefined
                        ),
                        ts.factory.createParameterDeclaration(
                            undefined,
                            undefined,
                            ts.factory.createIdentifier('res'),
                            undefined,
                            ts.factory.createTypeReferenceNode(
                                ts.factory.createIdentifier(methodInfo.resTypeName),
                                undefined
                            ),
                            undefined
                        ),
                    ];

                    return ts.factory.updateMethodDeclaration(
                        node,
                        newModifiers,
                        undefined,
                        node.name,
                        undefined,
                        node.typeParameters,
                        newParameters,
                        node.type,
                        node.body
                    );
                }

                return ts.visitEachChild(node, visitor, ctx);
            };

            return ts.visitNode(src, visitor);
        };
    };

    const { transformed } = ts.transform(
        sourceFile,
        [classNameTransformer, createMethodsTransformer, patchMethodsTransformer],
        ts.getDefaultCompilerOptions()
    );

    const result = ts.createPrinter({ newLine: ts.NewLineKind.CarriageReturnLineFeed });

    return result.printFile(transformed[0]);
}
