import { BadRequestError } from '../errors/app-error.js';

const VERSION_ETAG = /^"([1-9]\d*)"$/;

/** A document version as a strong ETag, such as `"3"`. */
export function versionToEtag(version: number): string {
  return `"${version}"`;
}

/**
 * Reads the document version a client expects from an If-Match header. Weak
 * validators, wildcards and lists are rejected: a write must name one version.
 */
export function requireIfMatchVersion(headerValue: string | undefined): number {
  if (headerValue === undefined) {
    throw new BadRequestError('If-Match header is required', {
      ifMatch: 'Send the current resource ETag, for example "3"',
    });
  }

  const version = Number(VERSION_ETAG.exec(headerValue.trim())?.[1]);
  if (!Number.isSafeInteger(version)) {
    throw new BadRequestError('If-Match must be a quoted version number', {
      ifMatch: 'Expected a header like "3"',
    });
  }

  return version;
}
