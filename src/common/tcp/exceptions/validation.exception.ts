import { HttpException, HttpStatus } from '@nestjs/common';

export class ValidationException extends HttpException {
  constructor(message: string, field?: string) {
    const errorResponse = {
      message,
      field,
      timestamp: new Date().toISOString(),
    };

    super(errorResponse, HttpStatus.BAD_REQUEST);
  }
}