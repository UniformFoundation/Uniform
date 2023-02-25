module.exports = {
    arrowParens: 'avoid',
    bracketSpacing: true,
    printWidth: 120,
    singleQuote: true,
    tabWidth: 4,
    trailingComma: 'es5',
    useTabs: false,
    endOfLine: 'lf',
    importOrder: ['^@root/(.*)$', '^@common/(.*)$', '^[./]', '^[../]'],
    importOrderSeparation: true,
    importOrderSortSpecifiers: true,
    plugins: [require('@trivago/prettier-plugin-sort-imports')],
};
