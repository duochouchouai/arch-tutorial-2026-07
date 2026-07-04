export class AppError extends Error{
    constructor(
        public readonly statusCode: number,
        message:string,
    ) {
       super(message);
       this.name='AppError';
    }
}

export class NotFoundError extends AppError {
    constructor(message = '资源未找到') {
        super(404, message);
    }
}


export class ValidationError extends AppError {
    constructor(message: string) {
        super(400, message);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = '认证失败'){
        super(401, message);
    }
}

export class ConflictError extends AppError {
    constructor(message: string) {
        super(409, message);
    }
}