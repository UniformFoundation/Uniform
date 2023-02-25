type From = string;
type Field = string;

export class ImportsGenerator {
    private map = new Map<From, Field[]>;

    addImport(from: From, field: Field){
        if (!this.map.has(from)) this.map.set(from, [])

        if (this.map.get(from)!.includes(field)) return;

        this.map.get(from)!.push(field);
    }

    generate(): string {
        const lines: string[] = [];

        const fromNames = [...this.map.keys()];

        fromNames.forEach((fromName: string) => {
            const imports = this.map.get(fromName)!;
            lines.push(`import { ${imports.join(', ')} } from '${fromName}';`);
        })

        return lines.join("\n");
    }
}