import type { Express } from 'express';
import request from 'supertest';
import { cookieHeader } from './session-cookies.js';

export const TEST_ORIGIN = 'http://localhost:3000';
const API = '/api/v1';
const TEST_PASSWORD = 'correct horse battery staple';

type Method = 'get' | 'post' | 'patch' | 'put' | 'delete';

/** Requests carrying one user's session cookie, CSRF token and allowed origin. */
export interface ApiSession {
  get: (path: string) => request.Test;
  post: (path: string) => request.Test;
  patch: (path: string) => request.Test;
  put: (path: string) => request.Test;
  delete: (path: string) => request.Test;
}

function createApiSession(app: Express, cookie: string, csrfToken: string): ApiSession {
  const send = (method: Method) => (path: string) =>
    request(app)
      [method](`${API}${path}`)
      .set('Origin', TEST_ORIGIN)
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrfToken);

  return {
    get: send('get'),
    post: send('post'),
    patch: send('patch'),
    put: send('put'),
    delete: send('delete'),
  };
}

/** The If-Match value for a resource as the API last returned it. */
export function etagOf(resource: { version: number }): string {
  return `"${String(resource.version)}"`;
}

export async function registerUser(app: Express, email: string): Promise<ApiSession> {
  const res = await request(app)
    .post(`${API}/auth/register`)
    .set('Origin', TEST_ORIGIN)
    .send({ email, password: TEST_PASSWORD, displayName: 'Test User' });
  if (res.status !== 201) {
    throw new Error(`Could not register ${email}: ${String(res.status)}`);
  }

  const { csrfToken } = res.body as { csrfToken: string };
  return createApiSession(app, cookieHeader(res), csrfToken);
}
