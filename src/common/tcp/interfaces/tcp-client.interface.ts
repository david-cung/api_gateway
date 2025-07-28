// interfaces/tcp-client.interface.ts
import { ClientProxy } from '@nestjs/microservices';

export interface ITcpClientProvider {
  // Updated method signature để support multiple services
  getClient(serviceName?: string): Promise<ClientProxy>;
  
  // Connection status methods
  getConnectionStatus(serviceName?: string): boolean;
  
  // Optional methods cho advanced features
  forceReconnect?(serviceName?: string): Promise<void>;
  testConnection?(serviceName?: string): Promise<{ success: boolean; latency?: number; error?: string }>;
  getAllServicesStatus?(): Record<string, any>;
  warmupConnections?(serviceNames: string[]): Promise<void>;
  
}