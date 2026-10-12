import { describe, expect, it } from 'vitest';
import { keyBetween } from './fractional-index.js';

function sorted(keys: string[]): string[] {
  return [...keys].sort();
}

describe('keyBetween', () => {
  it('returns a key for an empty list', () => {
    expect(keyBetween(null, null)).toBe('V');
  });

  it('inserts at the end', () => {
    const first = keyBetween(null, null);
    const second = keyBetween(first, null);

    expect(second > first).toBe(true);
  });

  it('inserts at the start', () => {
    const first = keyBetween(null, null);
    const before = keyBetween(null, first);

    expect(before < first).toBe(true);
  });

  it('inserts between two neighbours', () => {
    const low = 'V';
    const high = 'W';
    const middle = keyBetween(low, high);

    expect(middle > low && middle < high).toBe(true);
  });

  it('keeps the lexicographic order of 100 consecutive appends', () => {
    const keys: string[] = [];
    let last: string | null = null;
    for (let i = 0; i < 100; i++) {
      last = keyBetween(last, null);
      keys.push(last);
    }

    expect(sorted(keys)).toEqual(keys);
    expect(new Set(keys).size).toBe(100);
  });

  it('keeps the order of 100 consecutive prepends', () => {
    const keys: string[] = [];
    let first: string | null = null;
    for (let i = 0; i < 100; i++) {
      first = keyBetween(null, first);
      keys.unshift(first);
    }

    expect(sorted(keys)).toEqual(keys);
    expect(new Set(keys).size).toBe(100);
  });

  it('never runs out of room when inserting repeatedly in the same gap', () => {
    const low = 'V';
    let high = 'W';
    for (let i = 0; i < 200; i++) {
      const middle = keyBetween(low, high);
      expect(middle > low && middle < high).toBe(true);
      high = middle;
    }
  });

  it('never produces a key ending in the zero digit', () => {
    const keys = ['V', 'W', '1', 'z'];
    for (const key of keys) {
      expect(keyBetween(null, key).endsWith('0')).toBe(false);
      expect(keyBetween(key, null).endsWith('0')).toBe(false);
    }
  });

  it('handles keys of different lengths', () => {
    const middle = keyBetween('V', 'VV');

    expect(middle > 'V' && middle < 'VV').toBe(true);
  });

  it('rejects neighbours given in the wrong order', () => {
    expect(() => keyBetween('W', 'V')).toThrow(RangeError);
    expect(() => keyBetween('V', 'V')).toThrow(RangeError);
  });

  it('rejects malformed keys', () => {
    expect(() => keyBetween('', null)).toThrow(RangeError);
    expect(() => keyBetween('1.000000', null)).toThrow(RangeError);
    expect(() => keyBetween('V0', null)).toThrow(RangeError);
  });

  it('keeps the 10th task after the 9th (regression for decimal-string ordering)', () => {
    const keys: string[] = [];
    let last: string | null = null;
    for (let i = 0; i < 12; i++) {
      last = keyBetween(last, null);
      keys.push(last);
    }

    expect(sorted(keys)).toEqual(keys);
  });
});
