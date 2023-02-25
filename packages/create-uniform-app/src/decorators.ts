export const dependencies = new Map<string, string[]>();

interface DependencyGraphLeaf {
    name: string;
    in: string[];
    out: string[];
}

export const getDependencyOrder = () => {
    const graph = new Map<string, DependencyGraphLeaf>();

    const depKeys = dependencies.keys();
    // 1. Find root
    for (const dependant of depKeys) {
        const deps = dependencies.get(dependant)!;

        for (const dep of deps) {
            if (!graph.has(dep)) {
                graph.set(dep, {
                    name: dep,
                    in: [],
                    out: [],
                });
            }

            graph.get(dep)!.out.push(dependant);
        }

        if (!graph.has(dependant)) {
            graph.set(dependant, {
                in: [],
                out: [],
                name: dependant,
            });
        }

        graph.get(dependant)!.in.push(...deps);
    }

    let root: string | undefined = undefined;

    for (const [k, v] of graph.entries()) {
        if (v.in.length === 0) {
            if (typeof root !== 'undefined')
                throw new Error(
                    `Error: multiple root dependencies. Please check these generators: [${[root, k].join()}]`
                );
            root = k;
        }
    }

    if (!root) throw new Error(`Error: no root dependency found`);

    // 2. Determine execution steps
    const result: string[] = [];

    const q: DependencyGraphLeaf[] = [graph.get(root)!];
    while (q.length) {
        const cur = q.shift()!;
        const hasMoreInputsThanLoaded = cur.in.length && cur.in.some(e => !result.includes(e));

        if (!hasMoreInputsThanLoaded && !result.includes(cur.name)) {
            result.push(cur.name);
        }

        if (cur.out.length) {
            q.push(...cur.out.map(e => graph.get(e)!));
        }
    }

    return result;
};

export const GeneratorRequires = (others: Function[]) => {
    return (target: Function) => {
        if (!dependencies.has(target.name)) {
            dependencies.set(target.name, []);
        }

        dependencies.get(target.name)!.push(...others.map(e => e.name));
    };
};
