import { describe, expect, it } from 'vitest';
import { BadRequestError } from '../errors/app-error.js';
import { requireIfMatchVersion, versionToEtag } from './etag.js';

describe('version ETags', () => {
  it('formats a version as a quoted strong validator', () => {
    expect(versionToEtag(12)).toBe('"12"');
  });

  it('reads the version back from If-Match', () => {
    expect(requireIfMatchVersion('"12"')).toBe(12);
    expect(requireIfMatchVersion(' "3" ')).toBe(3);
  });

  it.each(['12', 'W/"12"', '*', '"0"', '"1", "2"', '"99999999999999999999"'])(
    'rejects malformed If-Match %j',
    (value) => {
      expect(() => requireIfMatchVersion(value)).toThrow(BadRequestError);
    },
  );

  it('rejects a missing If-Match', () => {
    expect(() => requireIfMatchVersion(undefined)).toThrow(BadRequestError);
  });
});
