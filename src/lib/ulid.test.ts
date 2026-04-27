import { describe, it, expect } from 'vitest';
import { newUlid, isValidUlid } from './ulid';

describe('newUlid', () => {
  it('returns a 26-character string', () => {
    expect(newUlid()).toHaveLength(26);
  });

  it('returns unique values', () => {
    expect(newUlid()).not.toBe(newUlid());
  });
});

describe('isValidUlid', () => {
  it('accepts a valid ULID', () => {
    expect(isValidUlid(newUlid())).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidUlid('')).toBe(false);
  });

  it('rejects lowercase', () => {
    expect(isValidUlid('01aryz6s41tpzk4bpvhj3axebz')).toBe(false);
  });
});
