export const SESSION_COOKIE_NAME = 'agenda_session';
export const CSRF_COOKIE_NAME = 'agenda_csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';

export function parseCookies(headerValue: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>();

  for (const part of headerValue?.split(';') ?? []) {
    const [name, ...valueParts] = part.trim().split('=');
    if (!name || valueParts.length === 0) {
      continue;
    }

    cookies.set(name, decodeURIComponent(valueParts.join('=')));
  }

  return cookies;
}
