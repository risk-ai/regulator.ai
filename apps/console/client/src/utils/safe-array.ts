/**
 * Safe Array Utilities
 * 
 * Prevents crashes from undefined/null arrays in API responses
 */

export function safeArray<T>(arr: T[] | undefined | null): T[] {
  return Array.isArray(arr) ? arr : [];
}

export function safeMap<T, R>(
  arr: T[] | undefined | null,
  fn: (item: T, index: number, array: T[]) => R
): R[] {
  return safeArray(arr).map(fn);
}

export function safeFilter<T>(
  arr: T[] | undefined | null,
  fn: (item: T, index: number, array: T[]) => boolean
): T[] {
  return safeArray(arr).filter(fn);
}

export function safeFind<T>(
  arr: T[] | undefined | null,
  fn: (item: T, index: number, array: T[]) => boolean
): T | undefined {
  return safeArray(arr).find(fn);
}

export function safeSome<T>(
  arr: T[] | undefined | null,
  fn: (item: T, index: number, array: T[]) => boolean
): boolean {
  return safeArray(arr).some(fn);
}

export function safeEvery<T>(
  arr: T[] | undefined | null,
  fn: (item: T, index: number, array: T[]) => boolean
): boolean {
  return safeArray(arr).every(fn);
}
