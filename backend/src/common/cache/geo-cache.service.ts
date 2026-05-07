import { Injectable, Logger } from '@nestjs/common';
import { Socket, connect as netConnect } from 'node:net';
import { TLSSocket, connect as tlsConnect } from 'node:tls';

type CacheEntry = {
  expiresAt: number;
  value: string;
};

@Injectable()
export class GeoCacheService {
  private readonly logger = new Logger(GeoCacheService.name);
  private readonly memoryCache = new Map<string, CacheEntry>();
  private readonly redisUrl = process.env.REDIS_URL;

  async get<T>(key: string): Promise<T | null> {
    const redisValue = await this.getFromRedis(key);
    const value = redisValue ?? this.getFromMemory(key);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(value);
    this.setInMemory(key, serialized, ttlSeconds);
    await this.setInRedis(key, serialized, ttlSeconds);
  }

  private getFromMemory(key: string): string | null {
    const entry = this.memoryCache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.value;
  }

  private setInMemory(key: string, value: string, ttlSeconds: number): void {
    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  private async getFromRedis(key: string): Promise<string | null> {
    if (!this.redisUrl) {
      return null;
    }

    try {
      return await this.executeRedisCommand(['GET', key]);
    } catch (error) {
      this.logger.warn(`Redis GET failed: ${(error as Error).message}`);
      return null;
    }
  }

  private async setInRedis(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (!this.redisUrl) {
      return;
    }

    try {
      await this.executeRedisCommand(['SETEX', key, String(ttlSeconds), value]);
    } catch (error) {
      this.logger.warn(`Redis SETEX failed: ${(error as Error).message}`);
    }
  }

  private executeRedisCommand(args: string[]): Promise<string | null> {
    const redisUrl = this.redisUrl;

    if (!redisUrl) {
      return Promise.resolve(null);
    }

    return new Promise((resolve, reject) => {
      const url = new URL(redisUrl);
      const port = Number(url.port || 6379);
      const host = url.hostname;
      const socket: Socket | TLSSocket =
        url.protocol === 'rediss:'
          ? tlsConnect({ host, port, servername: host })
          : netConnect({ host, port });
      const commands = this.buildRedisCommands(url, args);
      const chunks: Buffer[] = [];
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error('Redis command timed out'));
      }, 1500);

      socket.on('connect', () => socket.write(commands.join('')));
      socket.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
        const parsed = this.tryParseRedisResponses(Buffer.concat(chunks), commands.length);

        if (parsed.complete) {
          clearTimeout(timeout);
          socket.end();
          resolve(parsed.value);
        }
      });
      socket.on('error', (error: Error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private buildRedisCommands(url: URL, args: string[]): string[] {
    const commands: string[][] = [];

    if (url.password) {
      const password = decodeURIComponent(url.password);
      const username = url.username ? decodeURIComponent(url.username) : '';
      commands.push(username ? ['AUTH', username, password] : ['AUTH', password]);
    }

    const db = url.pathname.replace('/', '');
    if (db) {
      commands.push(['SELECT', db]);
    }

    commands.push(args);

    return commands.map((command) => this.serializeRedisCommand(command));
  }

  private serializeRedisCommand(args: string[]): string {
    return `*${args.length}\r\n${args
      .map((arg) => {
        const value = Buffer.from(arg);
        return `$${value.byteLength}\r\n${arg}\r\n`;
      })
      .join('')}`;
  }

  private tryParseRedisResponses(
    buffer: Buffer,
    expectedResponses: number,
  ): { complete: boolean; value: string | null } {
    let remaining = buffer.toString('utf8');
    let value: string | null = null;

    for (let index = 0; index < expectedResponses; index += 1) {
      const parsed = this.tryParseSingleRedisResponse(remaining);

      if (!parsed.complete) {
        return { complete: false, value: null };
      }

      value = parsed.value;
      remaining = remaining.slice(parsed.consumed);
    }

    return { complete: true, value };
  }

  private tryParseSingleRedisResponse(response: string): {
    complete: boolean;
    consumed: number;
    value: string | null;
  } {
    if (response.startsWith('$-1\r\n')) {
      return { complete: true, consumed: 5, value: null };
    }

    if (response.startsWith('+')) {
      const end = response.indexOf('\r\n');
      return end > -1
        ? { complete: true, consumed: end + 2, value: response.slice(1, end) }
        : { complete: false, consumed: 0, value: null };
    }

    if (response.startsWith('$')) {
      const lineEnd = response.indexOf('\r\n');
      if (lineEnd === -1) {
        return { complete: false, consumed: 0, value: null };
      }

      const length = Number(response.slice(1, lineEnd));
      const valueStart = lineEnd + 2;
      const valueEnd = valueStart + length;

      if (response.length < valueEnd + 2) {
        return { complete: false, consumed: 0, value: null };
      }

      return {
        complete: true,
        consumed: valueEnd + 2,
        value: response.slice(valueStart, valueEnd),
      };
    }

    if (response.startsWith('-')) {
      const end = response.indexOf('\r\n');
      const message = end > -1 ? response.slice(1, end) : 'Redis error';
      throw new Error(message);
    }

    return { complete: false, consumed: 0, value: null };
  }
}
