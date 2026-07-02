import { getDatabase } from './database';
import { User } from '../domain/user';
import { CreateUserInput, LockStatus, UserRepository, UserWithPassword } from '../domain/user-repository';

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
 * SQLite 实现的用户仓库
 *
 * 实现 domain 层定义的 UserRepository 接口。
 * 使用参数化查询（? 占位符）—— 对比 v1 的字符串拼接。
 */
export class SqliteUserRepository implements UserRepository {
  async findById(id: number): Promise<User | null> {
    const db = getDatabase();
    const row = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(id) as UserRow | undefined;
    return row ? toUser(row) : null;
  }

  async findByUsername(username: string): Promise<UserWithPassword | null> {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined;
    return row ? toUserWithPassword(row) : null;
  }

  async findByEmail(email: string): Promise<UserWithPassword | null> {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
    return row ? toUserWithPassword(row) : null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const db = getDatabase();
    const result = db.prepare(
      'INSERT INTO users (username, email, hashed_password) VALUES (?, ?, ?)',
    ).run(input.username, input.email, input.hashedPassword);

    return { id: Number(result.lastInsertRowid), username: input.username, email: input.email };
  }

  async updateResetToken(userId: number, token: string, expiresAt: string): Promise<void> {
    const db = getDatabase();
    db.prepare('UPDATE users SET reset_token = ?, reset_token_expires_at = ? WHERE id = ?').run(token, expiresAt, userId);
  }

  async findByResetToken(token: string): Promise<UserWithPassword | null> {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM users WHERE reset_token = ? AND reset_token_expires_at > ?')
      .get(token, new Date().toISOString()) as UserRow | undefined;
    return row ? toUserWithPassword(row) : null;
  }

  async updatePassword(userId: number, newHashedPassword: string): Promise<void> {
    const db = getDatabase();
    db.prepare('UPDATE users SET hashed_password = ?, reset_token = NULL, reset_token_expires_at = NULL WHERE id = ?')
      .run(newHashedPassword, userId);
  }

  async getLockStatus(userId: number): Promise<LockStatus> {
    const db = getDatabase();
    const row = db.prepare('SELECT failed_attempts, locked_until FROM users WHERE id = ?')
      .get(userId) as { failed_attempts: number; locked_until: string | null } | undefined;
    return row
      ? { failedAttempts: row.failed_attempts, lockedUntil: row.locked_until }
      : { failedAttempts: 0, lockedUntil: null };
  }

  async incrementFailedAttempts(userId: number): Promise<number> {
    const db = getDatabase();
    db.prepare('UPDATE users SET failed_attempts = failed_attempts + 1 WHERE id = ?').run(userId);
    const row = db.prepare('SELECT failed_attempts FROM users WHERE id = ?').get(userId) as { failed_attempts: number };
    return row.failed_attempts;
  }

  async resetLockStatus(userId: number): Promise<void> {
    const db = getDatabase();
    db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(userId);
  }

  async lockAccount(userId: number, lockedUntil: string): Promise<void> {
    const db = getDatabase();
    db.prepare('UPDATE users SET locked_until = ? WHERE id = ?').run(lockedUntil, userId);
  }

  async createRememberToken(userId: number, token: string, expiresAt: string): Promise<void> {
    const db = getDatabase();
    db.prepare('INSERT INTO remember_tokens (user_id, token, expires_at) VALUES (?, ?, ?)').run(userId, token, expiresAt);
  }

  async findUserIdByRememberToken(token: string): Promise<number | null> {
    const db = getDatabase();
    const row = db.prepare('SELECT user_id FROM remember_tokens WHERE token = ? AND expires_at > ?')
      .get(token, new Date().toISOString()) as { user_id: number } | undefined;
    return row ? row.user_id : null;
  }

  async deleteRememberToken(token: string): Promise<void> {
    const db = getDatabase();
    db.prepare('DELETE FROM remember_tokens WHERE token = ?').run(token);
  }
}
