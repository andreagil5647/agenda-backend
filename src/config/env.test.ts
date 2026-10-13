import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from './env.js';

const MONGODB_URI = 'mongodb+srv://user:s3cret@cluster0.example.mongodb.net/';

describe('loadConfig', () => {
  it('applies defaults when only the required variables are set', () => {
    const config = loadConfig({ MONGODB_URI });

    expect(config).toEqual({
      env: 'development',
      port: 4000,
      version: 'dev',
      mongo: { uri: MONGODB_URI, dbName: 'agenda' },
      http: {
        corsOrigins: ['http://localhost:3000'],
        trustProxyHops: 1,
        rateLimit: { windowMs: 900_000, max: 600 },
      },
      demo: { rateLimitMax: 20, maxActiveUsers: 200 },
      log: { level: 'info' },
    });
  });

  it('coerces numeric variables', () => {
    const config = loadConfig({ MONGODB_URI, PORT: '10000', TRUST_PROXY_HOPS: '2' });

    expect(config.port).toBe(10000);
    expect(config.http.trustProxyHops).toBe(2);
  });

  it('parses a comma-separated list of CORS origins', () => {
    const config = loadConfig({
      MONGODB_URI,
      CORS_ORIGINS: ' https://agenda.onrender.com , http://localhost:3000,',
    });

    expect(config.http.corsOrigins).toEqual([
      'https://agenda.onrender.com',
      'http://localhost:3000',
    ]);
  });

  it.each([
    ['a wildcard', '*'],
    ['a path', 'https://agenda.onrender.com/app'],
    ['a trailing slash', 'https://agenda.onrender.com/'],
    ['a non-http scheme', 'ftp://agenda.onrender.com'],
  ])('rejects a CORS origin with %s', (_label, value) => {
    expect(() => loadConfig({ MONGODB_URI, CORS_ORIGINS: value })).toThrow(ConfigError);
  });

  it('treats empty strings as unset', () => {
    const config = loadConfig({ MONGODB_URI, PORT: '', LOG_LEVEL: '' });

    expect(config.port).toBe(4000);
    expect(config.log.level).toBe('info');
  });

  it('shortens the Render commit hash into the version', () => {
    const config = loadConfig({
      MONGODB_URI,
      RENDER_GIT_COMMIT: '0123456789abcdef0123456789abcdef01234567',
    });

    expect(config.version).toBe('0123456');
  });

  it('names every invalid variable without echoing its value', () => {
    const run = () => loadConfig({ MONGODB_URI: 'postgres://user:s3cret@db', PORT: 'not-a-port' });

    expect(run).toThrow(ConfigError);
    expect(run).toThrow(/MONGODB_URI/);
    expect(run).toThrow(/PORT/);
    expect(run).not.toThrow(/s3cret/);
  });

  it('requires MONGODB_URI', () => {
    expect(() => loadConfig({})).toThrow(/MONGODB_URI/);
  });
});
