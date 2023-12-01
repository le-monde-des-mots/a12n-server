import { OneTimeToken } from './types';
import { User } from '../types';
import db from '../database';
import { PrincipalService } from '../principal/service';
import { BadRequest } from '@curveball/http-errors';
import { generateSecretToken } from '../crypto';

/**
 * 2 hour token timeout
 */
const tokenTTL = 7200;

/**
 * This function will create a unique token then store it in the database
 */
export async function createToken(user: User, expiresIn: number | null): Promise<OneTimeToken> {
  const token = await generateSecretToken();
  const expiresAt = Math.floor(Date.now() / 1000) + (expiresIn ?? tokenTTL);

  await db('reset_password_token').insert({
    user_id: user.id,
    token,
    expires_at: expiresAt,
    created_at: Math.floor(Date.now() / 1000)
  });
  return {
    token,
    expires: new Date(Date.now() + tokenTTL*1000),
    ttl: tokenTTL,
  };
}
/**
 * Checks if a 'password reset token' is valid, and returns the associated user.
 * This function only works once for every token.
 * After calling this function, the token automatically gets deleted.
 */
export async function validateToken(token: string): Promise<User> {

  const query = 'SELECT token, user_id FROM reset_password_token WHERE token = ? AND expires_at > ?';
  const result = await db.raw(query, [token, Math.floor(Date.now() / 1000)]);

  if (result[0].length !== 1) {
    throw new BadRequest ('Failed to validate token');
  } else {
    await db.raw('DELETE FROM reset_password_token WHERE token = ?', [token]);
    const principalService = new PrincipalService('insecure');
    return principalService.findById(result[0][0].user_id) as Promise<User>;
  }

}
