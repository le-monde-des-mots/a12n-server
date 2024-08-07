import { authenticator } from 'otplib';
import db from '../../database.js';
import { NewTotpDevice, TotpDevice } from './types.js';
import { UserTotpRecord } from 'knex/types/tables.js';

export function generateSecret(): string {
  const secret = authenticator.generateSecret();

  return secret;
}

export async function save(totpDevice: NewTotpDevice): Promise<TotpDevice> {
  const newTotpDeviceRecord: Partial<UserTotpRecord> = {
    user_id: totpDevice.user.id,
    secret: totpDevice.secret,
    created: Math.floor(Date.now() / 1000),
  };

  await db('user_totp').insert(newTotpDeviceRecord);

  return {
    'failures': 0,
    ...totpDevice,
  };
}
