import { AppError, ConflictError, NotFoundError, ValidationError } from '@/errors/AppError.js';

describe('AppError', () => {
  it('should set message, statusCode, code, and name', () => {
    const error = new AppError('something went wrong', 422, 'UNPROCESSABLE');

    expect(error.message).toBe('something went wrong');
    expect(error.statusCode).toBe(422);
    expect(error.code).toBe('UNPROCESSABLE');
    expect(error.name).toBe('AppError');
  });

  it('should be an instance of Error', () => {
    const error = new AppError('test', 400, 'TEST');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.stack).toBeDefined();
  });
});

describe('NotFoundError', () => {
  it('should build the message with resource name and id when id is provided', () => {
    const error = new NotFoundError('User', '42');

    expect(error.message).toBe("User with id '42' not found");
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.name).toBe('NotFoundError');
    expect(error).toBeInstanceOf(AppError);
  });

  it('should build the message with resource name only when id is omitted', () => {
    const error = new NotFoundError('User');

    expect(error.message).toBe('User not found');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
  });
});

describe('ValidationError', () => {
  it('should create a 400 error with VALIDATION_ERROR code', () => {
    const error = new ValidationError('email is required');

    expect(error.message).toBe('email is required');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.name).toBe('ValidationError');
    expect(error).toBeInstanceOf(AppError);
  });
});

describe('ConflictError', () => {
  it('should create a 409 error with CONFLICT code', () => {
    const error = new ConflictError('email already exists');

    expect(error.message).toBe('email already exists');
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('CONFLICT');
    expect(error.name).toBe('ConflictError');
    expect(error).toBeInstanceOf(AppError);
  });
});
