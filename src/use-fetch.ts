import useAsync, { AsyncResult } from '@nutgaard/use-async';
import { useCallback, useMemo, useState } from 'react';
import cache from './fetch-cache';

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

export default function useFetch<TYPE>(
    url: string,
    option?: RequestInit,
    config: Config = {
        lazy: false,
        cacheKey: undefined
    }
): FetchResult<TYPE> {
    const [statusCode, setStatusCode] = useState<number>(-1);
    const defaultCacheKey: string = createCacheKey(url, option);
    const cacheKey = config.cacheKey || defaultCacheKey;
    const source = useCallback(
        (isRerun: boolean) => {
            setStatusCode(-1);
            const response = isRerun ? fetch(url, option) : cache.fetch(cacheKey, url, option);
            if (isRerun) {
                cache.put(cacheKey, response);
            }
            return response.then((resp) => {
                setStatusCode(resp.status);
                return resp.json();
            });
        },
        [url, option, cacheKey]
    );

    const asyncResult = useAsync(source, config.lazy);
    return useMemo(() => {
        return {
            ...asyncResult,
            statusCode
        };
    }, [asyncResult, statusCode]);
}
