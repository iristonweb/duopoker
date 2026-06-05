import type Redis from 'ioredis';
import RedisClient from 'ioredis';
import { config } from '../config.js';

let client: Redis | null = null;
let ready = false;

const connect = (): Redis | null => {
  if (!config.redisUrl?.trim()) return null;
  if (client) return client;
  client = new RedisClient(config.redisUrl, {
    maxRetriesPerRequest: 2,
    lazyConnect: true,
    enableOfflineQueue: false
  });
  client.on('ready', () => {
    ready = true;
  });
  client.on('error', () => {
    ready = false;
  });
  void client.connect().catch(() => {
    ready = false;
  });
  return client;
};

export const isRedisReady = (): boolean => ready;

/** Redis wrapper — no-ops when REDIS_URL is unset or connection failed (Neon-only deploy). */
export const redis = {
  async set(key: string, value: string, ...args: (string | number)[]): Promise<void> {
    const c = connect();
    if (!c) return;
    try {
      if (args.length > 0) {
        await c.set(key, value, ...(args as [string, ...number[]]));
      } else {
        await c.set(key, value);
      }
      ready = true;
    } catch {
      ready = false;
    }
  },
  async get(key: string): Promise<string | null> {
    const c = connect();
    if (!c) return null;
    try {
      const v = await c.get(key);
      ready = true;
      return v;
    } catch {
      ready = false;
      return null;
    }
  },
  async del(key: string): Promise<void> {
    const c = connect();
    if (!c) return;
    try {
      await c.del(key);
    } catch {
      ready = false;
    }
  },
  async publish(channel: string, message: string): Promise<void> {
    const c = connect();
    if (!c) return;
    try {
      await c.publish(channel, message);
    } catch {
      ready = false;
    }
  }
};
