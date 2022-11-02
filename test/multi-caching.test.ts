import { describe, expect, it, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';

import { sleep } from './utils';

import {
  Cache,
  caching,
  MemoryCache,
  MultiCache,
  multiCaching,
  Store,
} from '../src';

describe('multiCaching', () => {
  let memoryCache: MemoryCache;
  let memoryCache2: MemoryCache;
  let memoryCache3: MemoryCache;
  let multiCache: MultiCache;
  let ttl: number;
  let defaultTtl: number;
  let key: string;

  beforeEach(async () => {
    ttl = 100;
    defaultTtl = 5000;

    memoryCache = await caching('memory', {
      ttl,
    });
    memoryCache2 = await caching('memory', {
      ttl,
    });
    memoryCache3 = await caching('memory', {
      ttl,
    });

    key = faker.datatype.string(20);
  });

  describe('get(), set(), del(), reset(), mget(), mset()', () => {
    let value: string;

    beforeEach(() => {
      multiCache = multiCaching([memoryCache, memoryCache2, memoryCache3]);
      key = faker.datatype.string(20);
      value = faker.datatype.string();
    });

    describe('set()', () => {
      it('lets us set data in all caches', async () => {
        await multiCache.set(key, value, defaultTtl);
        await expect(memoryCache.get(key)).resolves.toEqual(value);
        await expect(memoryCache2.get(key)).resolves.toEqual(value);
        await expect(memoryCache3.get(key)).resolves.toEqual(value);
      });
    });

    describe('get()', () => {
      it('lets us get data', async () => {
        await multiCache.set(key, value, defaultTtl);
        await expect(multiCache.get(key)).resolves.toEqual(value);
      });
    });

    describe('wrap()', () => {
      it('should get data', async () => {
        await multiCache.wrap(key, async () => value);
        await expect(memoryCache.get(key)).resolves.toEqual(value);
        await expect(memoryCache2.get(key)).resolves.toEqual(value);
        await expect(memoryCache3.get(key)).resolves.toEqual(value);
        await expect(multiCache.wrap(key, async () => 'foo')).resolves.toEqual(
          value,
        );
      });
    });

    describe('del()', () => {
      it('should delete data', async () => {
        await multiCache.set(key, value);
        await multiCache.del(key);
        await expect(multiCache.get(key)).resolves.toBeUndefined();
      });
    });

    describe('reset()', () => {
      it('should reset cache', async () => {
        await multiCache.set(key, value);
        await multiCache.reset();
        await expect(multiCache.get(key)).resolves.toBeUndefined();
      });
    });

    describe('when cache fails', () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const empty = (async () => {}) as never;
      const cache: Cache = {
        get: async () => {
          throw new Error();
        },
        set: empty,
        del: empty,
        reset: empty,
        wrap: empty,
        store: {} as Store,
      };

      const cacheEmpty: Cache = {
        get: empty,
        set: empty,
        del: empty,
        reset: empty,
        wrap: empty,
        store: {} as Store,
      };

      it('should get error', async () => {
        multiCache = multiCaching([cache, memoryCache]);
        await multiCache.set(key, value);
        await expect(multiCache.get(key)).resolves.toEqual(value);
      });

      it('should get all error', async () => {
        multiCache = multiCaching([cache]);
        await multiCache.set(key, value);
        await expect(multiCache.get(key)).resolves.toBeUndefined();
      });

      it('should get empty', async () => {
        multiCache = multiCaching([cacheEmpty, memoryCache]);
        await multiCache.set(key, value);
        await expect(multiCache.get(key)).resolves.toEqual(value);
      });

      it('should get all empty', async () => {
        multiCache = multiCaching([cacheEmpty, cacheEmpty]);
        await multiCache.set(key, value);
        await expect(multiCache.get(key)).resolves.toBeUndefined();
      });
    });
  });

  describe('issues', () => {
    it('#253', async () => {
      const cache0 = await caching('memory', { ttl: 100 });
      const cache1 = await caching('memory', { ttl: 1000 });
      const multi = multiCaching([cache0, cache1]);
      const key = 'bar';
      const value = 'foo';

      const fn = async () => value;

      await multi.wrap(key, fn);
      await sleep(100);
      await expect(cache0.get(key)).resolves.toBeUndefined();
      await expect(cache1.get(key)).resolves.toEqual(value);

      await multi.wrap(key, fn);

      await expect(cache0.get(key)).resolves.toEqual(value);
      await expect(cache1.get(key)).resolves.toEqual(value);
    });
  });
});
