import { generatePage } from '../../helpers';
import { generateTable } from '../components/table';

export interface TablePageOptions {}

const pluralOfWord = (word: string) => {
    const vowels = ['a', 'e', 'i', 'o', 'u'];

    if (word.endsWith('y') && !vowels.includes(word[word.length - 2])) {
        return word.slice(0, -1) + 'ies';
    } else if (
        word.endsWith('s') ||
        word.endsWith('z') ||
        word.endsWith('x') ||
        word.endsWith('ch') ||
        word.endsWith('sh')
    ) {
        return word + 'es';
    } else {
        return word + 's';
    }
};

const ucFirst = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
const lcFirst = (str: string) => str.charAt(0).toLowerCase() + str.slice(1);

export const renderTablePage = (entityName: string) => {
    const plural = pluralOfWord(entityName);

    const columnsVarName = 'columns';
    const dataVarName = lcFirst(plural);

    const table = generateTable({
        clickableRows: true,
        columnsVarName,
        dataVarName,
        renderHeader: true,
        selectableRows: true,
    });

    const { pageComponent, sourceFile } = generatePage(
        [
            {
                hooksCode: `
                    const { pathname, query, push } = useRouter();
                    const activePage = +(query?.page || 1);            
                    const { data: metaData, error: metaError, isLoading: isMetaLoading } = use${ucFirst(plural)}Meta();
                    const meta = metaData?.data;
                    const { metaField, values, filtersActive, URLHelper, searchRequestFilter, emptyInitialValues } = useAutoFilters(meta);
                    const { data, isLoading, isIdle, error, isFetched } = use${ucFirst(plural)}(
                        {
                            ...((sort || meta?.default_sort) && {
                                sort: [sort || meta?.default_sort!],
                            }),
                            filter: searchRequestFilter,
                            pagination: { type: 'offset', limit: itemsPerPageCount, offset: (activePage - 1) * itemsPerPageCount },
                        },
                        Boolean(meta)
                    );
                    const ${dataVarName} = useAutoTableData<${entityName}>(data?.data, metaField, undefined);
                `,
                imports: {
                    react: ['useMemo'],
                    '@hooks': ['useAutoFilters', 'useAutoTableData'],
                },
            },
            {
                hooksCode: table.hooksCode,
                imports: table.imports,
            },
        ],
        {
            render() {
                return `<PageWrapper>
                    ${table.renderCode}
                </PageWrapper>`;
            },
        }
    );

    console.log(sourceFile.getFullText());
};
