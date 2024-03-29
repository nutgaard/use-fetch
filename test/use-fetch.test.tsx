import * as React from 'react';
import 'isomorphic-fetch';
import {act, renderHook} from '@testing-library/react-hooks';
import useFetch, {createCacheKey, setCacheKeyGenerator} from "../src/use-fetch"
import FetchMock, {ResponseUtils, SpyMiddleware} from "yet-another-fetch-mock";
import cache from "../src/fetch-cache";
import {Status, WithData} from '@nutgaard/use-async';

describe("use-cache", () => {
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
        cache.clear();
    });

    it("initial state", () => {
        const renderer = renderHook(() => useFetch('http://example.com/success'));
        const result = renderer.result.current;

        expect(result.status).toBe(Status.PENDING);
        expect(result.statusCode).toBe(-1);
        expect(result.rerun).toBeInstanceOf(Function);
    });

    it("on failure", (done) => {
        const renderer = renderHook(() => useFetch('http://example.com/failure'));

        setTimeout(() => {
            const result = renderer.result.current;
            expect(result.status).toBe(Status.ERROR);
            expect(result.statusCode).toBe(500);
            expect(result.rerun).toBeInstanceOf(Function);
            done();
        }, 50);

    });

    it("on success", (done) => {
        const renderer = renderHook(() => useFetch('http://example.com/success'));

        setTimeout(() => {
            const result = renderer.result.current;
            expect(result.status).toBe(Status.OK);
            expect(result.statusCode).toBe(200);
            expect(result.rerun).toBeInstanceOf(Function);
            done();
        }, 50);
    });

    it("should disregard cache on refetch", (done) => {
        const renderer = renderHook(() => useFetch('http://example.com/success'));

        act(() => {
            renderer.result.current.rerun();
        });

        setTimeout(() => {
            expect(spy.size()).toBe(2);
            done();
        }, 100);
    });

    it('should not call fetcher if lazy', (done) => {
        const renderer = renderHook(() => useFetch('http://example.com/success', undefined, { lazy: true }));

        setTimeout(() => {
            const result = renderer.result.current;
            expect(result.status).toBe(Status.INIT);
            expect(result.rerun).toBeInstanceOf(Function);
            expect(spy.size()).toBe(0);
            done();
        }, 50);
    });

    it('should use cached value is present', () => {
        const cacheKey = 'customkey';
        cache.putResolved(cacheKey, { data: 123 });

        const renderer = renderHook(() => useFetch('http://example.com/success', undefined, { cacheKey, lazy: false }));
        const result = renderer.result.current as WithData<{ data: number }>;

        expect(result.status).toBe(Status.RELOADING);
        expect(result.data).toEqual({ data: 123 });
        expect(cache.size()).toBe(1);
    });

    it('should use default key generator by default', (done) => {
        const renderer = renderHook(() => useFetch('http://example.com/success', undefined, { lazy: false }));

        setTimeout(() => {
            const result = renderer.result.current;
            expect(result.status).toBe(Status.OK);
            expect(cache.size()).toBe(1);
            expect(cache.keys()).toContain('http://example.com/success||GET||||');
            done();
        }, 50);
    });

    it('should use provided key generator', (done) => {
        setCacheKeyGenerator((url: string) => url.toUpperCase());

        const renderer = renderHook(() => useFetch('http://example.com/success', undefined, { lazy: false }));
        setTimeout(() => {
            const result = renderer.result.current;
            expect(result.status).toBe(Status.OK);
            expect(cache.size()).toBe(1);
            expect(cache.keys()).toContain('HTTP://EXAMPLE.COM/SUCCESS');
            setCacheKeyGenerator(createCacheKey);
            done();
        }, 50);

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
