export function createCacheKey({ url = '', method = '', body = '', headers = '' } = {}) {
    return [url, method.toUpperCase(), body, headers].join('||');
}

interface Cache {
    [key: string]: Promise<Response>;
}

export const cache: Cache = {};

export default function fetchcache(url: string, init?: RequestInit): Promise<Response> {
    const method = (init && init.method) || 'GET';
    const body = (init && init.body && init.body.toString()) || '';
    const headers = (init && init.headers && JSON.stringify(init.headers)) || '';
    const cacheKey: string = createCacheKey({ url, method, body, headers });

    if (cache[cacheKey]) {
        return cache[cacheKey].then(response => response.clone());
    }
    const resp: Promise<Response> = fetch(url, init);

    cache[cacheKey] = resp;

    resp.then(
        response => {
            if (!response.ok) {
                delete cache[cacheKey];
            }
        },
        () => {
            delete cache[cacheKey];
        }
    );

    return resp.then(response => response.clone());
}
