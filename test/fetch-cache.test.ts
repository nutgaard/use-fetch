import 'isomorphic-fetch';
import FetchMock, { ResponseUtils, SpyMiddleware } from 'yet-another-fetch-mock';
import fetch, { cache } from './../src/fetch-cache';

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
        fetch('key1', '/test1').then(() => {
            expect(spy.lastUrl()).toBe('/test1');
            expect(Object.keys(cache)).toHaveLength(1);
            done();
        });
    });

    it('should dedupe similar fetch calls', done => {
        mock.get('/test2', {});
        Promise.all([fetch('key2', '/test2'), fetch('key2', '/test2')]).then(() => {
            expect(spy.lastUrl()).toBe('/test2');
            expect(spy.size()).toBe(1);
            done();
        });
    });

    it('should remove cache entry on failures', done => {
        mock.get('/test6', ResponseUtils.statusCode(500));
        fetch('key6', '/test6').then(() => {
            expect(spy.lastUrl()).toBe('/test6');
            expect(spy.size()).toBe(1);
            expect(Object.keys(cache)).toHaveLength(0);
            done();
        });
    });

    it('should support stream json multiple times', done => {
        mock.get('/test7', { data: 'string' });
        Promise.all([
            fetch('key7', '/test7').then(r => r.json()),
            fetch('key7', '/test7').then(r => r.json())
        ]).then(data => {
            expect(spy.lastUrl()).toBe('/test7');
            expect(spy.size()).toBe(1);
            expect(Object.keys(cache)).toHaveLength(1);
            expect(data).toEqual([{ data: 'string' }, { data: 'string' }]);
            done();
        });
    });
});
