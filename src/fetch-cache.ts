class FetchCache {
    private cache: { [key: string]: Promise<Response> } = {};
    private resolvedCache: { [key: string]: any } = {};

    fetch(key: string, url: string, init?: RequestInit): Promise<Response> {
        if (this.hasKey(key)) {
            return this.get(key).then((resp) => resp.clone());
        }

        const result = fetch(url, init);
        this.put(key, result);

        result.then(
            (resp) => {
                if (!resp.ok) {
                    this.remove(key);
                }
            },
            () => {
                this.remove(key);
            }
        );

        return result.then((resp) => resp.clone());
    }

    get(key: string) {
        return this.cache[key];
    }

    getResolved(key: string) {
        return this.resolvedCache[key];
    }

    putResolved(key: string, value: object) {
        this.resolvedCache[key] = value;
    }

    put(key: string, value: Promise<Response>) {
        this.cache[key] = value;
    }

    remove(key: string) {
        delete this.cache[key];
    }

    clear() {
        this.cache = {};
        this.resolvedCache = {};
    }

    hasKey(key: string) {
        // tslint:disable-next-line:strict-type-predicates
        return this.cache[key] !== undefined;
    }

    hasKeyResolved(key: string) {
        // tslint:disable-next-line:strict-type-predicates
        return this.resolvedCache[key] !== undefined;
    }

    size() {
        return Object.keys(this.cache).length;
    }
}

const globaleFetchCache = new FetchCache();

export default globaleFetchCache;
