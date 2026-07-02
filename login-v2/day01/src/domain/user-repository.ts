import { User } from './user';

export interface CreateUserInput {
    username: string;
    email: string;
    hashedPassword: string;
}

export interface UserWithPassword extends User {
    hashedPassword: string;
}

export interface UserRepository {
    findById(id: number): Promise<User | null>;
    findByUsername(username: string): Promise<UserWithPassword | null>;
    create(input: CreateUserInput): Promise<User>;
}