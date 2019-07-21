class FetchCache {
    private cache: { [key: string]: Promise<Response> } = {};

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

    put(key: string, value: Promise<Response>) {
        this.cache[key] = value;
    }

    remove(key: string) {
        delete this.cache[key];
    }

    clear() {
        this.cache = {};
    }

    hasKey(key: string) {
        // tslint:disable-next-line:strict-type-predicates
        return this.cache[key] !== undefined;
    }

    size() {
        return Object.keys(this.cache).length;
    }
}

const globaleFetchCache = new FetchCache();

export default globaleFetchCache;
