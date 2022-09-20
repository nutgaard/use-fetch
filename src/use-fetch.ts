import useAsync, { AsyncData, AsyncResult, Status } from '@nutgaard/use-async';
import { useCallback, useMemo, useState } from 'react';
import cache from './fetch-cache';

export { default as cache } from './fetch-cache';
export * from '@nutgaard/use-async';

export interface Config {
    lazy: boolean;
    cacheKey?: string;
}

export type FetchResult<TYPE> = { statusCode: number } & AsyncResult<TYPE>;

export function createCacheKey(url: string, option?: RequestInit) {
    const method = (option && option.method) || 'GET';
    const body = (option && option.body && option.body.toString()) || '';
    const headers = (option && option.headers && JSON.stringify(option.headers)) || '';
    return [url, method.toUpperCase(), body, headers].join('||');
}

export function setCacheKeyGenerator(keygenerator: typeof createCacheKey) {
    cacheKeyCreator = keygenerator;
}

let cacheKeyCreator: typeof createCacheKey = createCacheKey;

function handleResponse<TYPE>(
    response: Promise<Response>,
    setStatusCode: (status: number) => void,
    cacheKey: string
): Promise<TYPE> {
    return response
        .then((resp) => {
            setStatusCode(resp.status);
            if (!resp.ok) {
                throw new Error(resp.statusText);
            }
            if ([200, 201, 203, 206].includes(resp.status)) {
                return resp.json();
            }
            return;
        })
        .then((json) => {
            cache.putResolved(cacheKey, json);
            return json;
        });
}

export default function useFetch<TYPE>(
    url: string,
    option?: RequestInit,
    config: Config = {
        lazy: false,
        cacheKey: undefined
    }
): FetchResult<TYPE> {
    const [statusCode, setStatusCode] = useState<number>(-1);
    const cacheKey = config.cacheKey || cacheKeyCreator(url, option);
    const source = useCallback(
        (isRerun: boolean) => {
            setStatusCode(-1);
            const response = isRerun ? fetch(url, option) : cache.fetch(cacheKey, url, option);
            if (isRerun) {
                cache.put(cacheKey, response);
            }
            return handleResponse<TYPE>(response, setStatusCode, cacheKey);
        },
        [url, option, cacheKey]
    );
    const initialConfig: AsyncData<TYPE> | undefined = cache.hasKeyResolved(cacheKey)
        ? { status: Status.OK, data: cache.getResolved(cacheKey) }
        : undefined;
    const asyncResult = useAsync<TYPE>(source, config.lazy, [source], initialConfig);
    return useMemo(() => {
        return {
            ...asyncResult,
            statusCode
        };
    }, [asyncResult, statusCode]);
}
