# use-fetch

[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Build](https://github.com/nutgaard/use-fetch/actions/workflows/master.yaml/badge.svg)](https://github.com/nutgaard/use-fetch/actions/workflows/master.yaml)
[![codecov](https://codecov.io/gh/nutgaard/use-fetch/branch/master/graph/badge.svg)](https://codecov.io/gh/nutgaard/use-fetch)
[![dependencies Status](https://david-dm.org/nutgaard/use-fetch/status.svg)](https://david-dm.org/nutgaard/use-fetch)

Wrapper library around `@nutgaard/use-async` which simplifies doing fetch-request. 

### Installation

```
npm install @nutgaard/use-fetch --save
```

### Usage
The library exposes one hook `useFetch`, the cache, and three utility-functions from `@nutgaard/use-async` to help use the result (`isPending`, `hasData` and `hasError`).

```typescript jsx
import React from 'react';
import useFetch, { isPending, hasError } from '@nutgaard/use-fetch';

function LoadingComponent() {
    const result = useFetch('http://dummy.io');
    
    if (isPending(result)) {
      return <Spinner />;
    } else if (hasError(result)) {
      return <Error />
    } 
    
    return <pre>{result.data}</pre>
}
```

**Working with the cache:**
```typescript jsx
import { cache, createCacheKey } from '@nutgaard/use-fetch';

const options: RequestInit = { credentials: 'include' };

export function prefetch(url: string) {
    const cachekey = createCacheKey(url, options);
    cache.fetch(cachekey, url, options);
}

export function putIntoCache(url: string, value: any) {
    const cachekey = createCacheKey(url, options);
    cache.put(cachekey, Promise.resolve(new Response(JSON.stringify(value))));
}

export function removeFromCache(url: string) {
    const cachekey = createCacheKey(url, options);
    cache.remove(cachekey);
}

```

### useFetch API

| Argument  | Type | Optional | Default |
| ------------- | ------------- | ------------- | ------------- |
| `url`  | `string` | No | - |
| `option`  | `RequestInit`  | Yes | `undefined` |
| `config`  | `Config`  | Yes | `{ lazy: false, cacheKey: undefined }` |

The library will immediately perform `fetch(url, option)` when run, making sure to check its cache to avoid 
loading the same data more then once. 

If `lazy` is set to `true` it will not fetch data until `result.rerun()` is called. 
`cacheKey` may be used to override the cachekey used to index data, if left as `undefined` a key is generated based on `url` and `option`.

#### Types
Full documentation of types can be seen [here](https://www.utgaard.xyz/use-fetch/), or in the 80-ish lines of code.

## Credits

Made using the awesome [typescript library starter](https://github.com/alexjoverm/typescript-library-starter) 
