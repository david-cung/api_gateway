// src/common/tcp/services/base-tcp.service.ts
import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { 
  firstValueFrom, 
  timeout, 
  catchError, 
  throwError, 
  retry, 
  delay,
  timer,
  Observable 
} from 'rxjs';
import { EnhancedTcpClientProvider } from '../providers/enhanced-tcp-client.provider';
import { TcpCommunicationException } from '../exceptions/tcp-communication.exception';
import { TcpResponse } from '../interfaces/tcp-response.interface';
import { TCP_CONFIG, TCP_ERRORS } from '../constants/tcp.constants';

@Injectable()
export abstract class BaseTcpService implements OnModuleDestroy {
  protected readonly logger = new Logger(this.constructor.name);
  protected abstract readonly serviceName?: string; // Optional: để child services định nghĩa service name riêng

  constructor(protected readonly tcpClientProvider: EnhancedTcpClientProvider) {
    // Không khởi tạo client trong constructor nữa, sẽ lazy load
  }

  /**
   * Get service name - có thể override trong child classes
   */
  protected getServiceName(): string | undefined {
    return this.serviceName;
  }

  /**
   * Lazy initialization of TCP client với service name support
   */
  private async getClientSafely(): Promise<ClientProxy> {
    try {
      const serviceName = this.getServiceName();
      const client = await this.tcpClientProvider.getClient(serviceName);
      return client;
    } catch (error) {
      this.logger.error('Failed to get TCP client:', (error as Error).message);
      throw new TcpCommunicationException(
        'TCP service is not available. Please ensure the microservice is running.',
        'connection',
        error
      );
    }
  }

  /**
   * Clean up resources when module is destroyed
   */
  async onModuleDestroy(): Promise<void> {
    // EnhancedTcpClientProvider sẽ tự động handle cleanup
    this.logger.log('BaseTcpService cleanup completed');
  }

  /**
   * Send message with comprehensive error handling, timeout, and retry logic
   */
  protected async sendMessage<T>(
    pattern: string, 
    data: any,
    options: {
      timeout?: number;
      retries?: number;
      retryDelay?: number;
      serviceName?: string; // Override service name for specific calls
    } = {}
  ): Promise<T> {
    const {
      timeout: requestTimeout = TCP_CONFIG.DEFAULT_TIMEOUT,
      retries = TCP_CONFIG.MAX_RETRIES,
      retryDelay = TCP_CONFIG.RETRY_DELAY,
      serviceName: overrideServiceName,
    } = options;

    this.logger.debug(`Sending TCP message: ${pattern}`, { data });

    try {
      // Nếu có override serviceName, dùng nó, nếu không dùng default
      const targetServiceName = overrideServiceName || this.getServiceName();
      const client = targetServiceName 
        ? await this.tcpClientProvider.getClient(targetServiceName)
        : await this.getClientSafely();
      
      const result = await firstValueFrom(
        client.send<TcpResponse<T>>(pattern, data).pipe(
          timeout(requestTimeout),
          retry({
            count: retries,
            delay: (error, retryCount) => {
              this.logger.warn(`Retrying TCP call (${retryCount}/${retries}) for pattern: ${pattern}`);
              return timer(retryDelay * retryCount); // Exponential backoff
            }
          }),
          catchError((error) => this.handleTcpError(error, pattern))
        )
      );

      return this.processResponse<T>(result, pattern);
    } catch (error) {
      this.logger.error(`TCP communication failed for pattern: ${pattern}`, (error as Error).message);
      throw error;
    }
  }

  /**
   * Send message without waiting for response (fire and forget)
   */
  protected async emitMessage(
    pattern: string, 
    data: any, 
    options: { serviceName?: string } = {}
  ): Promise<void> {
    this.logger.debug(`Emitting TCP message: ${pattern}`, { data });
    
    try {
      const targetServiceName = options.serviceName || this.getServiceName();
      const client = targetServiceName 
        ? await this.tcpClientProvider.getClient(targetServiceName)
        : await this.getClientSafely();
      
      client.emit(pattern, data);
    } catch (error) {
      this.logger.error(`Failed to emit TCP message: ${pattern}`, (error as Error).message);
      // Don't throw for emit operations
    }
  }

  /**
   * Send batch messages in parallel
   */
  protected async sendBatchMessages<T>(
    requests: Array<{ 
      pattern: string; 
      data: any; 
      serviceName?: string; 
    }>,
    options: { 
      timeout?: number; 
      retries?: number;
      failFast?: boolean; // If true, fail immediately on first error
    } = {}
  ): Promise<Array<{ success: boolean; data?: T; error?: Error; pattern: string }>> {
    this.logger.debug(`Sending batch TCP messages: ${requests.length} requests`);

    const { failFast = false } = options;

    const promises = requests.map(async ({ pattern, data, serviceName }) => {
      try {
        const result = await this.sendMessage<T>(pattern, data, {
          ...options,
          serviceName,
        });
        return { success: true, data: result, pattern };
      } catch (error) {
        if (failFast) {
          throw error;
        }
        return { 
          success: false, 
          error: error as Error, 
          pattern 
        };
      }
    });

    if (failFast) {
      // If fail fast, use Promise.all
      const results = await Promise.all(promises);
      return results;
    } else {
      // If not fail fast, use Promise.allSettled
      const results = await Promise.allSettled(promises);
      
      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            success: false,
            error: result.reason,
            pattern: requests[index].pattern
          };
        }
      });
    }
  }

  /**
   * Send message to multiple services with same pattern
   */
  protected async sendToMultipleServices<T>(
    serviceNames: string[],
    pattern: string,
    data: any,
    options: {
      timeout?: number;
      retries?: number;
      failFast?: boolean;
    } = {}
  ): Promise<Record<string, { success: boolean; data?: T; error?: Error }>> {
    this.logger.debug(`Sending to multiple services: ${serviceNames.join(', ')} - pattern: ${pattern}`);

    const requests = serviceNames.map(serviceName => ({
      pattern,
      data,
      serviceName
    }));

    const results = await this.sendBatchMessages<T>(requests, options);
    
    // Convert array results to object keyed by service name
    const serviceResults: Record<string, { success: boolean; data?: T; error?: Error }> = {};
    
    results.forEach((result, index) => {
      const serviceName = serviceNames[index];
      serviceResults[serviceName] = {
        success: result.success,
        data: result.data,
        error: result.error
      };
    });

    return serviceResults;
  }

  /**
   * Handle TCP communication errors
   */
  private handleTcpError(error: any, pattern: string): Observable<never> {
    let errorMessage = TCP_ERRORS.CONNECTION_FAILED;

    if (error.name === 'TimeoutError') {
      errorMessage = TCP_ERRORS.TIMEOUT;
    } else if (error.message?.includes('ECONNREFUSED')) {
      errorMessage = TCP_ERRORS.SERVICE_UNAVAILABLE;
    } else if (error.message?.includes('ENOTFOUND')) {
      errorMessage = 'Service host not found';
    } else if (error.message?.includes('Failed to connect')) {
      errorMessage = TCP_ERRORS.SERVICE_UNAVAILABLE;
    }

    return throwError(() => new TcpCommunicationException(
      errorMessage,
      pattern,
      error
    ));
  }

  /**
   * Process and validate TCP response
   */
  private processResponse<T>(response: any, pattern: string): T {
    // Handle direct response (non-wrapped)
    if (response && typeof response === 'object' && !('success' in response)) {
      return response as T;
    }

    // Handle wrapped response
    const tcpResponse = response as TcpResponse<T>;
    
    if (!tcpResponse || typeof tcpResponse !== 'object') {
      throw new TcpCommunicationException(TCP_ERRORS.INVALID_RESPONSE, pattern);
    }

    if (tcpResponse.success === false) {
      throw new TcpCommunicationException(
        tcpResponse.error || tcpResponse.message || 'Service error',
        pattern
      );
    }

    return tcpResponse.data as T;
  }

  /**
   * Health check for TCP connection
   */
  async checkHealth(serviceName?: string): Promise<boolean> {
    try {
      await this.sendMessage('health_check', {}, { 
        timeout: 3000, 
        retries: 1,
        serviceName 
      });
      return true;
    } catch (error) {
      this.logger.error(`TCP health check failed for ${serviceName || 'default'}:`, (error as Error).message);
      return false;
    }
  }

  /**
   * Check health of multiple services
   */
  async checkMultipleServicesHealth(serviceNames: string[]): Promise<Record<string, boolean>> {
    const healthChecks = serviceNames.map(async (serviceName) => {
      const isHealthy = await this.checkHealth(serviceName);
      return { serviceName, isHealthy };
    });

    const results = await Promise.allSettled(healthChecks);
    
    const healthStatus: Record<string, boolean> = {};
    results.forEach((result, index) => {
      const serviceName = serviceNames[index];
      if (result.status === 'fulfilled') {
        healthStatus[serviceName] = result.value.isHealthy;
      } else {
        healthStatus[serviceName] = false;
      }
    });

    return healthStatus;
  }

  /**
   * Get connection status for current service
   */
  getConnectionStatus(): boolean {
    const serviceName = this.getServiceName();
    return this.tcpClientProvider.getConnectionStatus(serviceName);
  }

  /**
   * Force reconnect for current service
   */
  async forceReconnect(): Promise<void> {
    const serviceName = this.getServiceName();
    await this.tcpClientProvider.forceReconnect(serviceName);
  }

  /**
   * Test connection for current service
   */
  async testConnection(): Promise<{ success: boolean; latency?: number; error?: string }> {
    const serviceName = this.getServiceName();
    return this.tcpClientProvider.testConnection(serviceName);
  }
}