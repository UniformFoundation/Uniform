import path from 'path';

export function storagePath(subPath: string) {
    return path.resolve(__dirname, 'storage', subPath);
}

const DEV = process.env.NODE_ENV !== 'production';
const warnings = new Set();

export function warnOnce(...rest: string[]) {
    if (DEV) {
        const key = rest.join(' ');

        if (warnings.has(key)) {
            return;
        }

        warnings.add(key);
        console.warn(...rest);
    }
}
