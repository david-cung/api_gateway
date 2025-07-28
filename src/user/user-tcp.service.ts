import { EnhancedTcpClientProvider } from '@/common/tcp/providers/enhanced-tcp-client.provider';
import { BaseTcpService } from '@/common/tcp/services/base-tcp.service';
import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/request/create-user.dto';
import { CreateUserResDto } from './dto/response';
import { UpdateUserDto } from './dto/request/update-user.dto';


@Injectable()
export class UserTcpService extends BaseTcpService {
  protected readonly serviceName = 'user-service';

  constructor(tcpClientProvider: EnhancedTcpClientProvider) {
    super(tcpClientProvider);
  }

  // ===== USER OPERATIONS =====
  
  // async getAllUsers(): Promise<User[]> {
  //   return this.sendMessage<User[]>('get_all_users', {});
  // }

  // async getUserById(id: number): Promise<User> {
  //   return this.sendMessage<User>('get_user_by_id', { id });
  // }

  async createUser(userData: CreateUserDto): Promise<CreateUserResDto> {
    return this.sendMessage<CreateUserResDto>('create_user', userData);
  }

  async updateUser(id: string, userData: Partial<UpdateUserDto>): Promise<CreateUserResDto> {
    return this.sendMessage<CreateUserResDto>('update_user', { id, ...userData });
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.sendMessage<boolean>('delete_user', { id });
  }

  // ===== BATCH OPERATIONS =====
  
  // async getUsersByIds(ids: number[]): Promise<User[]> {
  //   const requests = ids.map(id => ({
  //     pattern: 'get_user_by_id',
  //     data: { id }
  //   }));

  //   const results = await this.sendBatchMessages<User>(requests);
    
  //   // Extract successful results
  //   return results
  //     .filter(result => result.success)
  //     .map(result => result.data!)
  //     .filter(Boolean);
  // }

  // ===== FIRE AND FORGET =====
  
  async notifyUserUpdate(userId: number): Promise<void> {
    await this.emitMessage('user_updated', { userId });
  }
}
