import { ulid } from 'ulid';

export const newUlid = () => ulid();
export const isValidUlid = (s: string) => /^[0-9A-Z]{26}$/.test(s);
