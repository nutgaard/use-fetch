interface Cache {
    [key: string]: Promise<Response>;
}

export const cache: Cache = {};

export default function fetchcache(
    cacheKey: string,
    url: string,
    init?: RequestInit
): Promise<Response> {
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
