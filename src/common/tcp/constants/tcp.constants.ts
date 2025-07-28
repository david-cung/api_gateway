export const TCP_CONFIG = {
  DEFAULT_TIMEOUT: 1000,
  MAX_RETRIES: 2,
  RETRY_DELAY: 500,
} as const;

export const TCP_ERRORS: Record<string, string> = {
  CONNECTION_FAILED: 'TCP connection failed',
  TIMEOUT: 'Request timeout',
  INVALID_RESPONSE: 'Invalid response from service',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
};