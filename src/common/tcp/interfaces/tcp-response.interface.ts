export interface TcpResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface TcpErrorResponse {
  error: string;
  message: string;
  statusCode?: number;
}