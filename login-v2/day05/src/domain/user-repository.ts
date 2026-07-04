import { User } from './user';

export interface CreateUserInput {
    username: string;
    email: string;
    hashedPassword: string;
}

export interface UserWithPassword extends User {
    hashedPassword: string;
}

export interface LockStatus {
    failedAttempts: number;
    lockedUntil: string | null;
}

export interface CreateOAuthUserInput {
    username: string;
    email: string;
    oauthProvider: string;
    oauthId: string;
}

export interface UserRepository {
    findById(id: number): Promise<User | null>;
    findByUsername(username: string): Promise<UserWithPassword | null>;
    findByEmail(email: string): Promise<UserWithPassword | null >;
    create(input: CreateUserInput): Promise<User>;
    

    updateResetToken(userId: number, token: string, expiresAt: string): Promise<void>;
    findByResetToken(token: string):Promise<UserWithPassword | null>;
    updatePassword(userId: number, newHashedPassword: string): Promise<void>;

    // 记住我
    createRememberToken(userId: number, token: string, expiresAt: string): Promise<void>;
    findUserIdByRememberToken(token: string): Promise<number | null>;
    deleteRememberToken(token: string): Promise<void>;

    // 登录限制（防爆破）
    getLockStatus(userId: number): Promise<LockStatus>;
    incrementFailedAttempts(userId: number): Promise<number>;
    resetLockStatus(userId: number): Promise<void>;
    lockAccount(userId: number, lockedUntil: string): Promise<void>;

    // 第三方登录
    findByOAuth(provider: string, oauthId: string): Promise<User | null>;
    createOAuthUser(input: CreateOAuthUserInput): Promise<User>;
}



