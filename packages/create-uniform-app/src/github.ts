import fetch from 'node-fetch-commonjs';

async function api(endpoint: string, token?: string) {
    const response = await fetch(`https://api.github.com/repos/${endpoint}`, {
        headers: token
            ? {
                  Authorization: `Bearer ${token}`,
              }
            : {},
    });

    return await response.json();
}

interface viaContentsApiProps {
    user: string;
    repository: string;
    ref?: string;
    directory: string;
    token?: string;
    getFullData?: boolean;
}

// Great for downloads with few sub directories on big repos
// Cons: many requests if the repo has a lot of nested dirs
export async function viaContentsApi({
    user,
    repository,
    ref = 'HEAD',
    directory,
    token,
    getFullData = false,
}: viaContentsApiProps) {
    const files = [];
    const contents = (await api(`${user}/${repository}/contents/${directory}?ref=${ref}`, token)) as
        | Record<string, any>
        | Record<string, any>[];

    if ('message' in contents && contents.message === 'Not Found') {
        return [];
    }

    if ('message' in contents && contents.message) {
        throw new Error(contents.message);
    }

    for (const item of contents as Record<string, any>[]) {
        if (item.type === 'file') {
            files.push(getFullData ? item : item.path);
        } else if (item.type === 'dir') {
            files.push(getFullData ? item : item.path);
        }
    }

    return files;
}
