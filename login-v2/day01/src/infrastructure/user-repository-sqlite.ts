import { getDatabase } from "./database";
import { User } from '../domain/user';
import { CreateUserInput, UserRepository, UserWithPassword } from "../domain/user-repository";

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

export class SqliteUserRepository implements UserRepository {
    async findById(id: number): Promise<User | null> {
        const db = getDatabase();
        const row = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(id) as UserRow | undefined;
        return row ? toUser(row) : null;
    }

    async findByUsername(username: string): Promise<UserWithPassword | null>{
        const db = getDatabase();
        const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined;
        return row ? toUserWithPassword(row) : null;
    }

    async create(input: CreateUserInput): Promise<User> {
        const db =getDatabase();
        const result = db.prepare(
            'INSERT INTO users (username,email,hashed_password) VALUES (?, ?, ?)',
        ).run(input.username, input.email, input.hashedPassword);

        return { id: Number(result.lastInsertRowid), username: input.username,email: input.email };
    }
}