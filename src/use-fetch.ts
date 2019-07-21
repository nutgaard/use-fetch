import useAsync, { AsyncResult } from '@nutgaard/use-async';
import { useCallback } from 'react';
import cache from './fetch-cache';

export interface Config {
    lazy: boolean;
    cacheKey?: string;
}

export function createCacheKey(url: string, option?: RequestInit) {
    const method = (option && option.method) || 'GET';
    const body = (option && option.body && option.body.toString()) || '';
    const headers = (option && option.headers && JSON.stringify(option.headers)) || '';
    return [url, method.toUpperCase(), body, headers].join('||');
}

export default function useFetch<TYPE>(
    url: string,
    option?: RequestInit,
    config: Config = {
        lazy: false,
        cacheKey: undefined
    }
): AsyncResult<TYPE> {
    const defaultCacheKey: string = createCacheKey(url, option);
    const cacheKey = config.cacheKey || defaultCacheKey;
    const source = useCallback(
        (isRerun: boolean) => {
            let response = isRerun ? fetch(url, option) : cache.fetch(cacheKey, url, option);
            if (isRerun) {
                cache.put(cacheKey, response);
            }
            return response.then((resp) => resp.json());
        },
        [url, option, cacheKey]
    );

    return useAsync(source, config.lazy);
}
