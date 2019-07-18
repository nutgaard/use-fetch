import * as React from 'react';
import 'isomorphic-fetch';
import {act, renderHook} from '@testing-library/react-hooks';
import useFetch, {usePromiseData, empty, FetchData, fetchData, createCacheKey} from "../src/use-fetch"
import {MaybeCls} from "@nutgaard/maybe-ts";
import FetchMock, {ResponseUtils, SpyMiddleware} from "yet-another-fetch-mock";
import {cache} from "../src/fetch-cache";

type State<S> = [S, React.Dispatch<React.SetStateAction<S>>];
describe("use-fetch", () => {
    let mock: FetchMock;
    let spy: SpyMiddleware;

    beforeEach(() => {
        spy = new SpyMiddleware();
        mock = FetchMock.configure({enableFallback: false, middleware: spy.middleware});
        mock.get('http://example.com/success', {data: 'data'});
        mock.get('http://example.com/failure', ResponseUtils.statusCode(500));
    });

    afterEach(() => {
        mock.restore();
        Object.keys(cache).forEach((key) => {
            delete cache[key];
        });
    });

    it("initial state", () => {
        const renderer = renderHook(() => useFetch('http://example.com/success'));
        const result = renderer.result.current;

        expect(result.isLoading).toBe(true);
        expect(result.isError).toBe(false);
        expect(result.isOk).toBe(false);
        expect(result.data).toEqual(MaybeCls.nothing());
        expect(result.refetch).toBeInstanceOf(Function);
    });

    it("on failure", (done) => {
        const renderer = renderHook(() => useFetch('http://example.com/failure'));

        setTimeout(() => {
            const result = renderer.result.current;
            expect(result.isLoading).toBe(false);
            expect(result.isError).toBe(true);
            expect(result.isOk).toBe(false);
            expect(result.data).toEqual(MaybeCls.nothing());
            expect(result.refetch).toBeInstanceOf(Function);
            done();
        }, 50);

    });

    it("on success", (done) => {
        const renderer = renderHook(() => useFetch('http://example.com/success'));

        setTimeout(() => {
            const result = renderer.result.current;
            expect(result.isLoading).toBe(false);
            expect(result.isError).toBe(false);
            expect(result.isOk).toBe(true);
            expect(result.data).toEqual(MaybeCls.just({data: 'data'}));
            expect(result.refetch).toBeInstanceOf(Function);
            done();
        }, 50);
    });

    it("on success promise", (done) => {
        const source: () => Promise<any> = () => {
            return fetch('http://example.com/success').then(resp => resp.json());
        };
        const renderer = renderHook(() => usePromiseData(source));

        setTimeout(() => {
            const result = renderer.result.current;
            expect(result.isLoading).toBe(false);
            expect(result.isError).toBe(false);
            expect(result.isOk).toBe(true);
            expect(result.data).toEqual(MaybeCls.just({data: 'data'}));
            expect(result.refetch).toBeInstanceOf(Function);
            done();
        }, 50);
    });

    it("should disregard cache on refetch", (done) => {
        const source: () => Promise<any> = () => {
            return fetch('http://example.com/success').then(resp => resp.json());
        };
        const renderer = renderHook(() => usePromiseData(source));

        act(() => {
            renderer.result.current.refetch();
        });

        setTimeout(() => {
            expect(spy.size()).toBe(2);
            done();
        }, 50);
    });

    it('should call fetcher if lazy', (done) => {
        const renderer = renderHook(() => useFetch('http://example.com/success', undefined, { lazy: true }));

        setTimeout(() => {
            const result = renderer.result.current;
            expect(result.isLoading).toBe(true);
            expect(result.isError).toBe(false);
            expect(result.isOk).toBe(false);
            expect(result.data).toEqual(MaybeCls.nothing());
            expect(result.refetch).toBeInstanceOf(Function);
            expect(spy.size()).toBe(0);
            done();
        }, 50);
    });

    it('should provide an empty-default object (initialValue in context etc)', () => {
        expect(empty.isLoading).toBe(false);
        expect(empty.isError).toBe(false);
        expect(empty.isOk).toBe(false);
        expect(empty.data).toEqual(MaybeCls.nothing());
        expect(empty.refetch).toBeInstanceOf(Function);
        expect(empty.refetch()).toBeUndefined();
    });

    it('should not break if unmounted', (done) => {
        const renderer = renderHook(() => useFetch('http://example.com/success'));
        renderer.unmount();

        setTimeout(() => {
            const result = renderer.result.current;
            expect(result.isLoading).toBe(true);
            expect(result.isError).toBe(false);
            expect(result.isOk).toBe(false);
            expect(result.data).toEqual(MaybeCls.nothing());
            expect(result.refetch).toBeInstanceOf(Function);
            done();
        }, 50);
    });

    it('should not call setState after unmount', (done) => {
        let setState = jest.fn();
        const stateArr: State<FetchData<any>> = [empty, setState];
        Promise.all([
            fetchData(stateArr, () => Promise.resolve('ok'), true),
            fetchData(stateArr, () => Promise.reject('ok'), true)
        ])
            .then(() => {
                expect(setState).toBeCalledTimes(2);
                done();
            });
    });


});

describe('createCacheKey', () => {
    it('should work without any input', () => {
        expect(createCacheKey('')).toBe('||GET||||');
    });

    it('should care about url', () => {
        expect(createCacheKey('test')).not.toEqual(createCacheKey('test2'));
    });

    it('should care about http-method', () => {
        expect(createCacheKey('',{ method: 'get'})).not.toEqual(createCacheKey('',{ method: 'post'}))
    });

    it('should care about body', () => {
        expect(createCacheKey('',{ body: 'get'})).not.toEqual(createCacheKey('',{ body: 'post'}))
    });

    it('should care about header', () => {
        expect(createCacheKey('',{ headers: { 'Content-Type': 'application'}})).not.toEqual(createCacheKey('',{ headers: { 'Content-Type': 'application2'}}))
    })
});
