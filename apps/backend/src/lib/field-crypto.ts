import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const PREFIX = 'enc:v1:';
let derivedKey: Buffer | null | undefined;

const getKey = (): Buffer | null => {
  if (derivedKey !== undefined) return derivedKey;
  const raw = process.env.DATA_ENCRYPTION_KEY?.trim();
  if (!raw) {
    derivedKey = null;
    return null;
  }
  derivedKey =
    /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : scryptSync(raw, 'duopoker-field-v1', 32);
  return derivedKey;
};

/** AES-256-GCM at-rest encryption for profile fields (avatar, status). */
export const encryptField = (plain: string | null | undefined): string | null => {
  if (plain == null || plain === '') return plain ?? null;
  const key = getKey();
  if (!key || plain.startsWith(PREFIX)) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${Buffer.concat([iv, tag, encrypted]).toString('base64url')}`;
};

export const decryptField = (stored: string | null | undefined): string | null => {
  if (stored == null || stored === '') return stored ?? null;
  if (!stored.startsWith(PREFIX)) return stored;
  const key = getKey();
  if (!key) return null;
  const buf = Buffer.from(stored.slice(PREFIX.length), 'base64url');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
};
