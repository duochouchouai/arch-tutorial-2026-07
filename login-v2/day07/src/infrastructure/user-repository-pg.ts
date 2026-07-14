import { getPool } from './database';
import { User } from '../domain/user';
import { CreateOAuthUserInput, CreateUserInput, LockStatus, UserRepository, UserWithPassword } from '../domain/user-repository';

interface UserRow {
  id: number;
  username: string;
  email: string;
  hashed_password: string;
}

function toUser(row: UserRow): User {
  return { id: row.id, username: row.username, email: row.email };
}

function toUserWithPassword(row: UserRow): UserWithPassword {
  return { id: row.id, username: row.username, email: row.email, hashedPassword: row.hashed_password };
}

/**
 * PostgreSQL 实现的用户仓库
 *
 * 对比 day06 的 SqliteUserRepository：
 *   - 参数占位符 ? → $1, $2, $3...
 *   - lastInsertRowid → RETURNING id
 *   - db.prepare().run/get/all() → pool.query()
 */
export class PgUserRepository implements UserRepository {
  async findById(id: number): Promise<User | null> {
    const pool = getPool();
    const result = await pool.query<UserRow>(
      'SELECT id, username, email FROM users WHERE id = $1', [id],
    );
    return result.rows[0] ? toUser(result.rows[0]) : null;
  }

  async findByUsername(username: string): Promise<UserWithPassword | null> {
    const pool = getPool();
    const result = await pool.query<UserRow>(
      'SELECT * FROM users WHERE username = $1', [username],
    );
    return result.rows[0] ? toUserWithPassword(result.rows[0]) : null;
  }

  async findByEmail(email: string): Promise<UserWithPassword | null> {
    const pool = getPool();
    const result = await pool.query<UserRow>(
      'SELECT * FROM users WHERE email = $1', [email],
    );
    return result.rows[0] ? toUserWithPassword(result.rows[0]) : null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const pool = getPool();
    const result = await pool.query<{ id: number }>(
      'INSERT INTO users (username, email, hashed_password) VALUES ($1, $2, $3) RETURNING id',
      [input.username, input.email, input.hashedPassword],
    );
    return { id: result.rows[0].id, username: input.username, email: input.email };
  }

  async updateResetToken(userId: number, token: string, expiresAt: string): Promise<void> {
    const pool = getPool();
    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires_at = $2 WHERE id = $3',
      [token, expiresAt, userId],
    );
  }

  async findByResetToken(token: string): Promise<UserWithPassword | null> {
    const pool = getPool();
    const result = await pool.query<UserRow>(
      'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires_at > $2',
      [token, new Date().toISOString()],
    );
    return result.rows[0] ? toUserWithPassword(result.rows[0]) : null;
  }

  async updatePassword(userId: number, newHashedPassword: string): Promise<void> {
    const pool = getPool();
    await pool.query(
      'UPDATE users SET hashed_password = $1, reset_token = NULL, reset_token_expires_at = NULL WHERE id = $2',
      [newHashedPassword, userId],
    );
  }

  async getLockStatus(userId: number): Promise<LockStatus> {
    const pool = getPool();
    const result = await pool.query<{ failed_attempts: number; locked_until: string | null; lock_count: number }>(
      'SELECT failed_attempts, locked_until, lock_count FROM users WHERE id = $1',
      [userId],
    );
    const row = result.rows[0];
    return row
      ? { failedAttempts: row.failed_attempts, lockedUntil: row.locked_until, lockCount: row.lock_count }
      : { failedAttempts: 0, lockedUntil: null, lockCount: 0 };
  }

  async incrementFailedAttempts(userId: number): Promise<number> {
    const pool = getPool();
    await pool.query(
      'UPDATE users SET failed_attempts = failed_attempts + 1 WHERE id = $1', [userId],
    );
    const result = await pool.query<{ failed_attempts: number }>(
      'SELECT failed_attempts FROM users WHERE id = $1', [userId],
    );
    return result.rows[0].failed_attempts;
  }

  async resetLockStatus(userId: number): Promise<void> {
    const pool = getPool();
    await pool.query(
      'UPDATE users SET failed_attempts = 0, locked_until = NULL, lock_count = 0 WHERE id = $1',
      [userId],
    );
  }

  async lockAccount(userId: number, lockedUntil: string): Promise<void> {
    const pool = getPool();
    await pool.query(
      'UPDATE users SET locked_until = $1, lock_count = lock_count + 1 WHERE id = $2',
      [lockedUntil, userId],
    );
  }

  async findByOAuth(provider: string, oauthId: string): Promise<User | null> {
    const pool = getPool();
    const result = await pool.query<UserRow>(
      'SELECT id, username, email FROM users WHERE oauth_provider = $1 AND oauth_id = $2',
      [provider, oauthId],
    );
    return result.rows[0] ? toUser(result.rows[0]) : null;
  }

  async createOAuthUser(input: CreateOAuthUserInput): Promise<User> {
    const pool = getPool();
    const result = await pool.query<{ id: number }>(
      'INSERT INTO users (username, email, hashed_password, oauth_provider, oauth_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [input.username, input.email, '', input.oauthProvider, input.oauthId],
    );
    return { id: result.rows[0].id, username: input.username, email: input.email };
  }

  async createRememberToken(userId: number, token: string, expiresAt: string): Promise<void> {
    const pool = getPool();
    await pool.query(
      'INSERT INTO remember_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expiresAt],
    );
  }

  async findUserIdByRememberToken(token: string): Promise<number | null> {
    const pool = getPool();
    const result = await pool.query<{ user_id: number }>(
      'SELECT user_id FROM remember_tokens WHERE token = $1 AND expires_at > $2',
      [token, new Date().toISOString()],
    );
    return result.rows[0] ? result.rows[0].user_id : null;
  }

  async deleteRememberToken(token: string): Promise<void> {
    const pool = getPool();
    await pool.query('DELETE FROM remember_tokens WHERE token = $1', [token]);
  }
}
