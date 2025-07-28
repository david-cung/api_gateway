import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { 
  ClientProxy, 
  ClientProxyFactory, 
  Transport, 
  TcpClientOptions,
  ClientOptions 
} from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { ITcpClientProvider } from '../interfaces/tcp-client.interface';

interface ServiceConfig {
  name: string;
  host: string;
  port: number;
  retryAttempts: number;
  retryDelay: number;
}

interface ConnectionInfo {
  client: ClientProxy | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionAttempts: number;
  lastUsed: number;
  healthCheckInterval?: NodeJS.Timeout;
}

@Injectable()
export class EnhancedTcpClientProvider implements ITcpClientProvider, OnModuleDestroy {
  private readonly logger = new Logger(EnhancedTcpClientProvider.name);
  private readonly connections = new Map<string, ConnectionInfo>();
  private readonly maxConnectionAttempts = 5;
  private readonly connectionTimeout = 10000;
  private readonly healthCheckInterval = 30000;
  private readonly maxIdleTime = 300000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private readonly configService: ConfigService) {
    // Start cleanup task cho idle connections
    this.startCleanupTask();
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down Enhanced TCP Client Provider...');
    
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Disconnect all connections
    const disconnectPromises = Array.from(this.connections.entries()).map(
      ([serviceName, connInfo]) => this.disconnectService(serviceName, connInfo)
    );
    
    await Promise.allSettled(disconnectPromises);
    this.connections.clear();
  }

  /**
   * Get client for specific service - Main method
   * If no serviceName provided, uses default service
   */
  async getClient(serviceName?: string): Promise<ClientProxy> {
    // Default service name nếu không provide
    const targetService = serviceName || this.getDefaultServiceName();
    
    const connInfo = this.connections.get(targetService);
    
    // Case 1: Connection exists and is healthy
    if (connInfo?.isConnected && connInfo.client) {
      connInfo.lastUsed = Date.now();
      return connInfo.client;
    }
    
    // Case 2: Connection exists but not connected - try to reconnect
    if (connInfo && !connInfo.isConnecting) {
      this.logger.log(`Reconnecting to service: ${targetService}`);
      await this.connectToService(targetService, connInfo);
      
      if (!connInfo.client) {
        throw new Error(`Failed to establish connection to ${targetService}`);
      }
      
      return connInfo.client;
    }
    
    // Case 3: Connection is being established - wait for it
    if (connInfo?.isConnecting) {
      this.logger.log(`Waiting for connection to service: ${targetService}`);
      return this.waitForConnection(targetService);
    }
    
    // Case 4: No connection exists - create new one
    this.logger.log(`Creating new connection to service: ${targetService}`);
    return this.createNewConnection(targetService);
  }

  /**
   * Create new connection for service
   */
  private async createNewConnection(serviceName: string): Promise<ClientProxy> {
    const config = this.getServiceConfig(serviceName);
    
    const connInfo: ConnectionInfo = {
      client: null,
      isConnected: false,
      isConnecting: true,
      connectionAttempts: 0,
      lastUsed: Date.now(),
    };
    
    this.connections.set(serviceName, connInfo);
    
    try {
      await this.connectToService(serviceName, connInfo);
      
      if (!connInfo.client) {
        throw new Error(`Failed to create client for ${serviceName}`);
      }
      
      return connInfo.client;
    } catch (error) {
      // Remove failed connection info
      this.connections.delete(serviceName);
      throw error;
    }
  }

  /**
   * Connect to specific service
   */
  private async connectToService(serviceName: string, connInfo: ConnectionInfo): Promise<void> {
    const config = this.getServiceConfig(serviceName);
    connInfo.isConnecting = true;
    connInfo.connectionAttempts++;

    try {
      this.logger.log(`Connecting to ${serviceName} at ${config.host}:${config.port} (attempt ${connInfo.connectionAttempts})`);

      // Create client - NestJS v11 syntax
      const clientOptions: ClientOptions = {
        transport: Transport.TCP,
        options: {
          host: config.host,
          port: config.port,
        },
      };

      connInfo.client = ClientProxyFactory.create(clientOptions);

      // Connect with timeout
      await Promise.race([
        connInfo.client.connect(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), this.connectionTimeout)
        )
      ]);

      connInfo.isConnected = true;
      connInfo.isConnecting = false;
      connInfo.connectionAttempts = 0;
      connInfo.lastUsed = Date.now();

      this.logger.log(`✅ Connected to ${serviceName} successfully`);

      // Setup connection handlers
      this.setupConnectionHandlers(serviceName, connInfo);
      
      // Start health check
      this.startHealthCheckForService(serviceName, connInfo);

    } catch (error) {
      connInfo.isConnected = false;
      connInfo.isConnecting = false;
      
      this.logger.error(`❌ Failed to connect to ${serviceName}:`, (error as Error).message);
      
      // Retry logic with exponential backoff
      if (connInfo.connectionAttempts < this.maxConnectionAttempts) {
        const retryDelay = Math.min(1000 * Math.pow(2, connInfo.connectionAttempts), 30000);
        
        this.logger.warn(`🔄 Retrying connection to ${serviceName} in ${retryDelay}ms`);
        
        setTimeout(async () => {
          if (this.connections.has(serviceName)) {
            try {
              await this.connectToService(serviceName, connInfo);
            } catch (retryError) {
              // Handle retry errors silently or log them
              this.logger.error(`Retry failed for ${serviceName}:`, (retryError as Error).message);
            }
          }
        }, retryDelay);
      } else {
        this.logger.error(`❌ Max connection attempts reached for ${serviceName}`);
        throw new Error(`Failed to connect to ${serviceName} after ${this.maxConnectionAttempts} attempts`);
      }
    }
  }

  /**
   * Wait for existing connection to be established
   */
  private async waitForConnection(serviceName: string, timeoutMs: number = 15000): Promise<ClientProxy> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const connInfo = this.connections.get(serviceName);
      
      if (connInfo?.isConnected && connInfo.client) {
        connInfo.lastUsed = Date.now();
        return connInfo.client;
      }
      
      if (!connInfo?.isConnecting) {
        throw new Error(`Connection to ${serviceName} failed during wait`);
      }
      
      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Timeout waiting for connection to ${serviceName}`);
  }

  /**
   * Setup connection event handlers
   */
  private setupConnectionHandlers(serviceName: string, connInfo: ConnectionInfo): void {
    if (!connInfo.client) return;

    try {
      const clientProxy = connInfo.client as any;
      
      if (clientProxy.on) {
        clientProxy.on('error', (error: any) => {
          this.logger.error(`TCP Client error for ${serviceName}:`, error.message);
          connInfo.isConnected = false;
        });

        clientProxy.on('close', () => {
          this.logger.warn(`TCP Client connection closed for ${serviceName}`);
          connInfo.isConnected = false;
        });
      }
    } catch (error) {
      this.logger.debug(`Event handling not supported for ${serviceName}`);
    }
  }

  /**
   * Start health check for specific service
   */
  private startHealthCheckForService(serviceName: string, connInfo: ConnectionInfo): void {
    // Clear existing health check
    if (connInfo.healthCheckInterval) {
      clearInterval(connInfo.healthCheckInterval);
    }

    connInfo.healthCheckInterval = setInterval(async () => {
      if (!connInfo.isConnected || !connInfo.client) {
        return;
      }

      try {
        const healthPromise = connInfo.client.send('health_check', {});
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        );

        await Promise.race([
          healthPromise.toPromise ? healthPromise.toPromise() : healthPromise,
          timeoutPromise
        ]);
        
        // Connection is healthy
        if (!connInfo.isConnected) {
          this.logger.log(`✅ Health check passed for ${serviceName} - connection restored`);
          connInfo.isConnected = true;
        }
      } catch (error) {
        if (connInfo.isConnected) {
          this.logger.warn(`❌ Health check failed for ${serviceName}:`, (error as Error).message);
          connInfo.isConnected = false;
        }
      }
    }, this.healthCheckInterval);
  }

  /**
   * Get service configuration
   */
  private getServiceConfig(serviceName: string): ServiceConfig {
    const envPrefix = serviceName.toUpperCase().replace(/-/g, '_');
    
    return {
      name: serviceName,
      host: this.configService.get<string>(`${envPrefix}_HOST`, 'localhost'),
      port: this.configService.get<number>(`${envPrefix}_PORT`, 3001),
      retryAttempts: this.configService.get<number>(`${envPrefix}_RETRY_ATTEMPTS`, 5),
      retryDelay: this.configService.get<number>(`${envPrefix}_RETRY_DELAY`, 3000),
    };
  }

  /**
   * Start cleanup task for idle connections
   */
  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [serviceName, connInfo] of this.connections.entries()) {
        // Close idle connections
        if (now - connInfo.lastUsed > this.maxIdleTime && connInfo.isConnected) {
          this.logger.log(`🧹 Closing idle connection to ${serviceName}`);
          this.disconnectService(serviceName, connInfo);
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Disconnect specific service
   */
  private async disconnectService(serviceName: string, connInfo: ConnectionInfo): Promise<void> {
    try {
      // Clear health check
      if (connInfo.healthCheckInterval) {
        clearInterval(connInfo.healthCheckInterval);
        connInfo.healthCheckInterval = undefined;
      }

      // Close client connection
      if (connInfo.client) {
        await connInfo.client.close();
        this.logger.log(`Disconnected from ${serviceName}`);
      }
    } catch (error) {
      this.logger.error(`Error disconnecting from ${serviceName}:`, (error as Error).message);
    } finally {
      connInfo.isConnected = false;
      this.connections.delete(serviceName);
    }
  }

  /**
   * Get default service name for backward compatibility
   */
  private getDefaultServiceName(): string {
    return this.configService.get<string>('DEFAULT_TCP_SERVICE', 'default-service');
  }

  // Public methods for monitoring and management

  /**
   * Get connection status - backward compatible with interface
   */
  getConnectionStatus(serviceName?: string): boolean {
    const targetService = serviceName || this.getDefaultServiceName();
    const connInfo = this.connections.get(targetService);
    return connInfo?.isConnected || false;
  }

  /**
   * Get detailed connection status for specific service
   */
  getServiceStatus(serviceName: string): {
    connected: boolean;
    connecting: boolean;
    connectionAttempts: number;
    lastUsed?: number;
  } | null {
    const connInfo = this.connections.get(serviceName);
    if (!connInfo) return null;

    return {
      connected: connInfo.isConnected,
      connecting: connInfo.isConnecting,
      connectionAttempts: connInfo.connectionAttempts,
      lastUsed: connInfo.lastUsed,
    };
  }

  /**
   * Get all services status
   */
  getAllServicesStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    for (const [serviceName, connInfo] of this.connections.entries()) {
      status[serviceName] = {
        connected: connInfo.isConnected,
        connecting: connInfo.isConnecting,
        connectionAttempts: connInfo.connectionAttempts,
        lastUsed: new Date(connInfo.lastUsed).toISOString(),
        uptime: connInfo.isConnected ? Date.now() - connInfo.lastUsed : 0,
      };
    }
    
    return status;
  }

  /**
   * Force reconnect to specific service
   */
  async forceReconnect(serviceName?: string): Promise<void> {
    const targetService = serviceName || this.getDefaultServiceName();
    this.logger.log(`🔄 Force reconnecting to ${targetService}...`);
    
    const connInfo = this.connections.get(targetService);
    if (connInfo) {
      await this.disconnectService(targetService, connInfo);
    }
    
    // Create new connection
    await this.createNewConnection(targetService);
  }

  /**
   * Test connection to specific service
   */
  async testConnection(serviceName?: string): Promise<{ success: boolean; latency?: number; error?: string }> {
    try {
      const targetService = serviceName || this.getDefaultServiceName();
      const client = await this.getClient(targetService);
      const startTime = Date.now();
      
      const healthPromise = client.send('health_check', {});
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Test timeout')), 3000)
      );

      await Promise.race([
        healthPromise.toPromise ? healthPromise.toPromise() : healthPromise,
        timeoutPromise
      ]);
      
      const latency = Date.now() - startTime;
      
      return { success: true, latency };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Warm up connections to specific services
   */
  async warmupConnections(serviceNames: string[]): Promise<void> {
    this.logger.log(`🔥 Warming up connections to: ${serviceNames.join(', ')}`);
    
    const warmupPromises = serviceNames.map(async (serviceName) => {
      try {
        await this.getClient(serviceName);
        this.logger.log(`✅ Warmed up connection to ${serviceName}`);
      } catch (error) {
        this.logger.warn(`⚠️ Failed to warm up connection to ${serviceName}: ${(error as Error).message}`);
      }
    });
    
    await Promise.allSettled(warmupPromises);
  }
}