export interface ComponentStructure {
    imports: Record<string, string[]>;

    hooksCode: string;
    renderCode: string;
}