import 'isomorphic-fetch';
import FetchMock, { ResponseUtils, SpyMiddleware } from 'yet-another-fetch-mock';
import fetch, { cache, createCacheKey } from './../src/fetch-cache';

describe('fetchcache', () => {
    let mock: FetchMock;
    let spy: SpyMiddleware;

    beforeEach(() => {
        spy = new SpyMiddleware();
        mock = FetchMock.configure({ enableFallback: false, middleware: spy.middleware });
    });

    afterEach(() => {
        mock.restore();
        Object.keys(cache).forEach(key => {
            delete cache[key];
        });
    });

    it('should call underlying fetch', done => {
        mock.get('/test1', {});
        fetch('/test1').then(() => {
            expect(spy.lastUrl()).toBe('/test1');
            expect(Object.keys(cache)).toHaveLength(1);
            done();
        });
    });

    it('should dedupe similar fetch calls', done => {
        mock.get('/test2', {});
        Promise.all([fetch('/test2'), fetch('/test2')]).then(() => {
            expect(spy.lastUrl()).toBe('/test2');
            expect(spy.size()).toBe(1);
            done();
        });
    });

    it('should care about http-method', done => {
        mock.get('/test3', {});
        mock.post('/test3', {});
        Promise.all([fetch('/test3'), fetch('/test3', { method: 'post' })]).then(() => {
            expect(spy.lastUrl()).toBe('/test3');
            expect(spy.size()).toBe(2);
            done();
        });
    });

    it('should care about body-content', done => {
        mock.post('/test4', {});
        Promise.all([
            fetch('/test4', { method: 'post', body: '' }),
            fetch('/test4', { method: 'post', body: 'another' })
        ]).then(() => {
            expect(spy.lastUrl()).toBe('/test4');
            expect(spy.size()).toBe(2);
            done();
        });
    });

    it('should care about headers', done => {
        mock.get('/test5', {});
        Promise.all([
            fetch('/test5', { headers: { 'Content-Type': 'application/json' } }),
            fetch('/test5', { headers: { 'Content-Type': 'text/plain' } })
        ]).then(() => {
            expect(spy.lastUrl()).toBe('/test5');
            expect(spy.size()).toBe(2);
            done();
        });
    });

    it('should remove cache entry on failures', done => {
        mock.get('/test6', ResponseUtils.statusCode(500));
        fetch('/test6').then(() => {
            expect(spy.lastUrl()).toBe('/test6');
            expect(spy.size()).toBe(1);
            expect(Object.keys(cache)).toHaveLength(0);
            done();
        });
    });

    it('should support stream json multiple times', done => {
        mock.get('/test7', { data: 'string' });
        Promise.all([
            fetch('/test7').then(r => r.json()),
            fetch('/test7').then(r => r.json())
        ]).then(data => {
            expect(spy.lastUrl()).toBe('/test7');
            expect(spy.size()).toBe(1);
            expect(Object.keys(cache)).toHaveLength(1);
            expect(data).toEqual([{ data: 'string' }, { data: 'string' }]);
            done();
        });
    });
});

describe('createCacheKey', () => {
    it('should work without any input', () => {
        expect(createCacheKey()).toBe('||||||');
    });
});
