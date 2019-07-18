import { MaybeCls as Maybe } from '@nutgaard/maybe-ts';
import { DependencyList, Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import fetch from './fetch-cache';

export type FetchData<TYPE> = {
    isLoading: boolean;
    isError: boolean;
    isOk: boolean;
    data: Maybe<TYPE>;
};

export type UseFetchHook<TYPE> = FetchData<TYPE> & {
    refetch(): void;
};

const initalState: FetchData<any> = {
    isLoading: true,
    isError: false,
    isOk: false,
    data: Maybe.nothing()
};

export const empty: UseFetchHook<any> = {
    isOk: false,
    isLoading: false,
    isError: false,
    data: Maybe.nothing(),
    refetch(): void {
        return;
    }
};

type State<S> = [S, Dispatch<SetStateAction<S>>];
export async function fetchData<TYPE>(
    stateArr: State<FetchData<TYPE>>,
    source: () => Promise<TYPE>,
    didCancel: boolean
) {
    const [state, setState] = stateArr;
    setState({ ...state, isLoading: true, isError: false });

    try {
        console.log('source', source);
        const json = await source();
        console.log('source', json);
        if (!didCancel) {
            setState({ isError: false, isLoading: false, data: Maybe.just(json), isOk: true });
        }
        return json;
    } catch (e) {
        if (!didCancel) {
            setState({ ...state, isError: true, isLoading: false, isOk: false });
        }
        console.error(e);
    }
}

function hookImpl<TYPE>(
    source: () => Promise<TYPE>,
    lazy: boolean,
    dependencyList?: DependencyList
): UseFetchHook<TYPE> {
    console.log('source', source);
    const [rerun, setRerun] = useState(0);
    const stateArr = useState<FetchData<TYPE>>(initalState);
    const [state, setState] = stateArr;

    useEffect(
        () => {
            let didCancel = false;

            if (!lazy) {
                fetchData(stateArr, source, didCancel).catch(() => {
                    return;
                });
            }

            return () => {
                didCancel = true;
            };
            // Alle skal være med, men eslint greier ikke å analysere den
            // eslint-disable-next-line react-hooks/exhaustive-deps
        },
        dependencyList ? [...dependencyList, rerun, lazy] : [source, rerun, lazy]
    );

    const refetch = useMemo(() => () => setRerun(rerun + 1), [rerun]);

    return { ...state, refetch };
}

export default function useFetch<TYPE>(
    url: string,
    option?: RequestInit,
    lazy: boolean = false
): UseFetchHook<TYPE> {
    const source = useMemo(
        () => async () => {
            const resp = await fetch(url, option);
            const json = await resp.json();
            return json as TYPE;
        },
        [url, option]
    );

    return usePromiseData(source, lazy);
}

export function usePromiseData<TYPE>(
    source: () => Promise<TYPE>,
    lazy: boolean = false,
    dependencyList?: DependencyList
): UseFetchHook<TYPE> {
    console.log('promisedata');
    return hookImpl<TYPE>(source, lazy, dependencyList);
}
