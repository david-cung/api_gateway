import { EnhancedTcpClientProvider } from '@/common/tcp/providers/enhanced-tcp-client.provider';
import { BaseTcpService } from '@/common/tcp/services/base-tcp.service';
import { Injectable } from '@nestjs/common';

interface User {
  id: number;
  name: string;
  email: string;
}

interface CreateUserDto {
  name: string;
  email: string;
}

@Injectable()
export class UserTcpService extends BaseTcpService {
  // Định nghĩa service name cho User Service
  protected readonly serviceName = 'user-service';

  constructor(tcpClientProvider: EnhancedTcpClientProvider) {
    super(tcpClientProvider);
  }

  // ===== USER OPERATIONS =====
  
  async getAllUsers(): Promise<User[]> {
    return this.sendMessage<User[]>('get_all_users', {});
  }

  async getUserById(id: number): Promise<User> {
    return this.sendMessage<User>('get_user_by_id', { id });
  }

  async createUser(userData: CreateUserDto): Promise<string> {
    const a = await this.sendMessage<string>('create_user', userData);
    console.log('aaaaa', a);
    return a;
  }

  async updateUser(id: number, userData: Partial<CreateUserDto>): Promise<User> {
    return this.sendMessage<User>('update_user', { id, ...userData });
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.sendMessage<boolean>('delete_user', { id });
  }

  // ===== BATCH OPERATIONS =====
  
  async getUsersByIds(ids: number[]): Promise<User[]> {
    const requests = ids.map(id => ({
      pattern: 'get_user_by_id',
      data: { id }
    }));

    const results = await this.sendBatchMessages<User>(requests);
    
    // Extract successful results
    return results
      .filter(result => result.success)
      .map(result => result.data!)
      .filter(Boolean);
  }

  // ===== FIRE AND FORGET =====
  
  async notifyUserUpdate(userId: number): Promise<void> {
    await this.emitMessage('user_updated', { userId });
  }
}
