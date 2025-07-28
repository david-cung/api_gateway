// src/common/tcp/tcp.module.ts
import { UserTcpService } from '@/user/user-tcp.service';
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EnhancedTcpClientProvider } from './providers/enhanced-tcp-client.provider';
import { BaseTcpService } from './services/base-tcp.service';

@Global() // Make this module global so you don't need to import it everywhere
@Module({
  imports: [ConfigModule],
  providers: [
    EnhancedTcpClientProvider,
    {
      provide: BaseTcpService,
      useClass: UserTcpService
    }
  ],
  exports: [
    EnhancedTcpClientProvider,
    BaseTcpService,
  ],
})
export class TcpModule {}