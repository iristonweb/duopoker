import { decryptField } from './field-crypto.js';

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
