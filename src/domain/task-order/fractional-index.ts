/**
 * Fractional indexing: order keys that sort lexicographically and can always
 * be squeezed between two existing keys without touching any other row.
 *
 * A key is read as a base-62 fraction (`0.d1d2d3...`). The digit alphabet is in
 * ASCII order, so plain string comparison matches numeric comparison.
 */

const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASE = DIGITS.length;
const ZERO = DIGITS.charAt(0);

function digitValue(char: string): number {
  return DIGITS.indexOf(char);
}

function digitAt(value: number): string {
  return DIGITS.charAt(value);
}

function assertValidKey(key: string): void {
  const isValid =
    key.length > 0 && !key.endsWith(ZERO) && key.split('').every((char) => DIGITS.includes(char));
  if (!isValid) {
    throw new RangeError(`Invalid order key: "${key}"`);
  }
}

function commonPrefixLength(lower: string, upper: string): number {
  let length = 0;
  while ((lower[length] ?? ZERO) === upper[length]) {
    length += 1;
  }
  return length;
}

/** Midpoint of `lower` (possibly empty) and `upper` (null means "no upper bound"). */
function midpoint(lower: string, upper: string | null): string {
  if (upper !== null) {
    const prefixLength = commonPrefixLength(lower, upper);
    if (prefixLength > 0) {
      return (
        upper.slice(0, prefixLength) +
        midpoint(lower.slice(prefixLength), upper.slice(prefixLength))
      );
    }
  }

  const lowerDigit = lower ? digitValue(lower.charAt(0)) : 0;
  const upperDigit = upper === null ? BASE : digitValue(upper.charAt(0));

  if (upperDigit - lowerDigit > 1) {
    return digitAt(Math.round((lowerDigit + upperDigit) / 2));
  }

  // Adjacent leading digits: either the longer upper bound already leaves room
  // below it, or we keep the lower digit and recurse into the next position.
  if (upper !== null && upper.length > 1) {
    return upper.slice(0, 1);
  }
  return digitAt(lowerDigit) + midpoint(lower.slice(1), null);
}

/**
 * Returns a key strictly between `lower` and `upper`. Pass `null` for an open
 * end: `(null, null)` is the first key, `(last, null)` appends, `(null, first)` prepends.
 */
export function keyBetween(lower: string | null, upper: string | null): string {
  if (lower !== null) assertValidKey(lower);
  if (upper !== null) assertValidKey(upper);
  if (lower !== null && upper !== null && lower >= upper) {
    throw new RangeError(`Order keys must be ascending: "${lower}" is not before "${upper}"`);
  }

  return midpoint(lower ?? '', upper);
}
