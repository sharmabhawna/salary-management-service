import { jest } from '@jest/globals';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '@/errors/AppError.js';
import { errorHandler } from '@/middleware/errorHandler.js';

const mockReq = {} as Request;
const mockNext = jest.fn() as jest.MockedFunction<NextFunction>;

function mockRes(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('errorHandler', () => {
  it('should respond with the AppError statusCode, code, and message', () => {
    const res = mockRes();
    const err = new AppError('record not found', 404, 'NOT_FOUND');

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'NOT_FOUND', message: 'record not found' },
    });
  });

  it('should respond with 500 and INTERNAL_SERVER_ERROR for unhandled errors', () => {
    const res = mockRes();
    const err = new Error('unexpected failure');
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
    expect(console.error).toHaveBeenCalledWith('Unhandled error:', err);
  });
});
