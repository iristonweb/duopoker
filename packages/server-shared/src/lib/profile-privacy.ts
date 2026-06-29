import { z } from 'zod';
import { decryptField, encryptField } from './field-crypto.js';

export const publicProfileSelect = {
  id: true,
  displayName: true,
  nickname: true,
  avatar: true,
  tableStatus: true,
  chips: true,
  level: true,
  xp: true
} as const;

export const ownerProfileSelect = {
  ...publicProfileSelect,
  email: true
} as const;

type ProfileRow = {
  avatar?: string | null;
  tableStatus?: string | null;
  email?: string;
  [key: string]: unknown;
};

export const decryptProfileRow = <T extends ProfileRow>(row: T): T => ({
  ...row,
  avatar: decryptField(row.avatar ?? null),
  tableStatus: decryptField(row.tableStatus ?? null)
});

export const encryptProfileWrite = (data: {
  avatar?: string | null;
  tableStatus?: string | null;
  displayName?: string;
}): typeof data => ({
  ...data,
  ...(data.avatar !== undefined ? { avatar: encryptField(data.avatar) } : {}),
  ...(data.tableStatus !== undefined ? { tableStatus: encryptField(data.tableStatus) } : {})
});

const ALLOWED_IMAGE = /^data:image\/(jpeg|png|webp|gif);base64,/i;

/** Only allow uploaded image data URLs — no external URLs (privacy + SSRF). */
export const safeAvatarField = z
  .string()
  .max(320_000)
  .refine((v) => ALLOWED_IMAGE.test(v), 'Avatar must be a JPEG, PNG, WebP, or GIF upload');
