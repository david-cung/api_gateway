import { HttpException, HttpStatus } from '@nestjs/common';

export class TcpCommunicationException extends HttpException {
  constructor(
    message: string,
    pattern: string,
    originalError?: any,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    const errorResponse = {
      message,
      pattern,
      timestamp: new Date().toISOString(),
      originalError: originalError?.message || originalError,
    };

    super(errorResponse, statusCode);
  }
}